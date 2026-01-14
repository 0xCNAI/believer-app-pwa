/**
 * Tech Store - Technical Analysis State Management
 * 
 * Manages user configurations and evaluation results
 * for the technical analysis engine.
 */

import {
    calculateReversalState,
    ReversalInputs,
    ReversalState
} from '@/services/phaseEngine';
import { fetchAllRealData } from '@/services/realApi';
import {
    CONDITION_DEFS,
    ConditionResult,
    DEFAULT_PERSONAL_PARAMS,
    evaluateTechConditions,
    PersonalParams,
} from '@/services/techEngine';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ============ Types ============

interface TechState {
    // User Settings
    enabledConditions: Record<string, boolean>;
    personalParams: PersonalParams;

    // Evaluation Results
    conditions: ConditionResult[];
    reversalState: ReversalState | null; // Replaces phaseResult
    reversalInputs: ReversalInputs | null; // Replaces riskModifiers
    lastEvaluated: number;
    isLoading: boolean;
    error: string | null;
    gateCount: number;
    higherLow: boolean;

    // Actions
    setConditionEnabled: (id: string, enabled: boolean) => void;
    setPersonalParam: <K extends keyof PersonalParams>(key: K, value: PersonalParams[K]) => void;
    evaluateAll: () => Promise<void>;
    fetchAndEvaluate: (force?: boolean) => Promise<void>;
    resetToDefaults: () => void;
    syncFromCloud: (uid: string) => Promise<void>;
}

// ============ Default State ============

const getDefaultEnabledConditions = (): Record<string, boolean> => {
    const result: Record<string, boolean> = {};
    for (const def of CONDITION_DEFS) {
        result[def.id] = def.defaultEnabled;
    }
    return result;
};

// ============ Store ============

export const useTechStore = create<TechState>()(
    persist(
        (set, get) => ({
            // Initial State
            enabledConditions: getDefaultEnabledConditions(),
            personalParams: { ...DEFAULT_PERSONAL_PARAMS },
            conditions: [],
            reversalState: null,
            reversalInputs: null,
            lastEvaluated: 0,
            isLoading: false,
            error: null,
            gateCount: 0,
            higherLow: false,

            // Actions
            setConditionEnabled: (id, enabled) => {
                set((state) => {
                    const newConditions = { ...state.enabledConditions, [id]: enabled };

                    try {
                        const { useAuthStore } = require('./authStore');
                        const uid = useAuthStore.getState().user?.id;
                        if (uid) {
                            require('@/services/statePersistence').saveUserConfig(uid, { enabledConditions: newConditions });
                        }
                    } catch (e) { }

                    return { enabledConditions: newConditions };
                });
            },

            setPersonalParam: (key, value) => {
                set((state) => {
                    const newParams = { ...state.personalParams, [key]: value };

                    try {
                        const { useAuthStore } = require('./authStore');
                        const uid = useAuthStore.getState().user?.id;
                        if (uid) {
                            require('@/services/statePersistence').saveUserConfig(uid, { personalParams: newParams });
                        }
                    } catch (e) { }

                    return { personalParams: newParams };
                });
            },

            // Action: Sync FROM Cloud (on login)
            syncFromCloud: async (uid: string) => {
                try {
                    const config = await require('@/services/statePersistence').loadUserConfig(uid);
                    if (config) {
                        set((state) => ({
                            enabledConditions: config.enabledConditions || state.enabledConditions,
                            personalParams: config.personalParams || state.personalParams,
                        }));
                        console.log('[TechStore] Synced from cloud');
                        // re-evaluate with new params
                        get().evaluateAll();
                    }
                } catch (e) { }
            },

            fetchAndEvaluate: async (force = false) => {
                const state = get();
                // 1. Freshness Check (5 minutes)
                // If data is fresh and we're not forcing, skip.
                // This prevents "reset to 0" if API fails on reload but we have cache.
                const now = Date.now();
                if (!force && state.lastEvaluated && (now - state.lastEvaluated < 300000)) {
                    console.log('[TechStore] Skipping fetch, data is fresh.');
                    return;
                }

                console.log('[TechStore] fetchAndEvaluate triggered');
                await get().evaluateAll();
            },

            evaluateAll: async () => {
                set({ isLoading: true, error: null });

                try {
                    const { enabledConditions, personalParams } = get();

                    // Get enabled condition IDs
                    const enabledIds = Object.entries(enabledConditions)
                        .filter(([_, enabled]) => enabled)
                        .map(([id]) => id);

                    console.log('[TechStore] Evaluation Context:', {
                        enabledIds,
                        params: personalParams
                    });

                    // 1. Fetch ALL Real Data
                    const [techResults, rawRealData] = await Promise.all([
                        evaluateTechConditions(enabledIds, personalParams),
                        fetchAllRealData()
                    ]);
                    const realData = rawRealData as any;

                    // 2. Prepare Inputs
                    // Get 'gateCount' and 'higherLow' from techResults
                    const gates = techResults.conditions.filter(c => c.group === 'Gate');
                    const enabledGates = gates.filter(g => g.enabled);
                    const passedGates = enabledGates.filter(g => g.passed);
                    const higherLowPassed = gates.find(g => g.id === 'higher_low')?.passed || false;

                    // Get passed boosters for tracking
                    const activeBoosters = techResults.conditions
                        .filter(c => c.group === 'Booster' && c.enabled && c.passed)
                        .map(b => b.id);

                    // Get Belief Points
                    let beliefPoints = 0;
                    try {
                        // Access store safely (lazy execution prevents cycle, but import is safer)
                        const { useBeliefStore } = require('./beliefStore'); // Keep require if strictly needed for cycle, but try static if possible?
                        // Actually, techStore -> beliefStore is safe.
                        const beliefState = useBeliefStore.getState();
                        const beliefs = beliefState.beliefs || [];
                        if (beliefs.length > 0) {
                            // Probabilities are 0..1.
                            // Convert to 0..25 points: avgProb * 25
                            // V4.1: Respect positiveOutcome configuration
                            const avgProb = beliefs.reduce((sum: number, b: any) => {
                                let prob = b.currentProbability;
                                // Invert if Positive Outcome is "No" (e.g. Recession = No is good)
                                if (b.marketEvent?.positiveOutcome === 'No') {
                                    prob = 1 - prob;
                                }
                                return sum + prob;
                            }, 0) / beliefs.length;
                            beliefPoints = avgProb * 25;
                        }
                    } catch (e) {
                        console.warn('[TechStore] Could not access beliefStore:', e);
                    }

                    const inputs: ReversalInputs = {
                        gateCount: passedGates.length,
                        higherLow: higherLowPassed,
                        puell: realData.puell ?? 0.8,     // Fallback to neutral
                        mvrvZScore: realData.mvrvZ ?? 1.5,// Fallback to neutral
                        funding24hWeighted: realData.derivatives?.funding24hWeighted ?? 0.01,
                        oi3dChangePct: realData.derivatives?.oi3dChangePct ?? 0,
                        beliefPoints
                    };

                    // [DEBUG LOGS]
                    const dataAgeMinutes = (Date.now() - (realData.updatedAt || 0)) / 60000;
                    console.log(`[TechStore] === Data Freshness ===`);
                    console.log(`[TechStore] Data Age: ${dataAgeMinutes.toFixed(1)} minutes`);

                    console.log(`[TechStore] === Belief Breakdown ===`);
                    console.log(`[TechStore] User Belief Points: ${beliefPoints.toFixed(2)} (AvgProb * 25)`);
                    console.log(`[TechStore] Macro Context (Ref Only): FearGreed=${realData.fearGreed?.value}, Dominance=${realData.btcDominance}`);
                    console.log(`[TechStore] Polymarket Points: Integrated into User Beliefs`);

                    console.log('[TechStore] Calculating Reversal with:', inputs);

                    // 3. Calculate Dual-Track Reversal State
                    const reversalState = calculateReversalState(inputs, activeBoosters);

                    // 4. Persistence & Diff Check (Edge Trigger Notification)
                    // 4. Persistence & Diff Check (Edge Trigger Notification)
                    try {
                        const { useAuthStore } = require('./authStore');
                        const user = useAuthStore.getState().user;

                        // A. Phase Change & Veto Notifications
                        if (user?.id) {
                            const { syncStateAndCheckDiff } = require('@/services/statePersistence');
                            syncStateAndCheckDiff({ id: user.id, email: user.email }, reversalState).then((result: any) => {
                                if (result.hasChanged && result.notifications.length > 0) {
                                    console.log('[Notifier] Phase/State Notifications:', result.notifications);

                                    // Push to Notification Store
                                    const notifStore = require('@/stores/notificationStore').useNotificationStore;
                                    result.notifications.forEach((msg: string) => {
                                        notifStore.getState().addNotification({
                                            type: 'PHASE',
                                            content: msg
                                        });
                                    });
                                }
                            });
                        }

                        // B. Volatility Check (Local)
                        // Check if any belief has > 30% change
                        const { useBeliefStore } = require('./beliefStore');
                        const beliefs = useBeliefStore.getState().beliefs || [];
                        const notifStore = require('@/stores/notificationStore').useNotificationStore;

                        beliefs.forEach((b: any) => {
                            const prev = b.previousProbability ?? b.currentProbability;
                            const delta = Math.abs(b.currentProbability - prev);
                            if (delta >= 0.3) { // 30% Threshold
                                const signalName = b.signal?.shortTitle || b.signal?.title || '未知訊號';
                                const msg = `${signalName} 波動劇烈 (${(delta * 100).toFixed(0)}%)`;

                                // Simple dedup check (optional, but good for UX)
                                // For now, just fire. Store generates unique IDs.
                                notifStore.getState().addNotification({
                                    type: 'VOLATILITY',
                                    content: msg
                                });
                            }
                        });

                    } catch (e) {
                        console.warn('[TechStore] Notification logic error:', e);
                    }

                    set({
                        conditions: techResults.conditions,
                        reversalState,
                        reversalInputs: inputs,
                        lastEvaluated: techResults.dataTimestamp,
                        isLoading: false,
                        gateCount: passedGates.length, // Update gateCount in state
                        higherLow: higherLowPassed, // Update higherLow in state
                    });
                } catch (error) {
                    console.error('[TechStore] Evaluation failed:', error);
                    set({
                        isLoading: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            },

            resetToDefaults: () => {
                set({
                    enabledConditions: getDefaultEnabledConditions(),
                    personalParams: { ...DEFAULT_PERSONAL_PARAMS },
                    conditions: [],
                    reversalState: null,
                    reversalInputs: null,
                    lastEvaluated: 0,
                    isLoading: false,
                    error: null,
                    gateCount: 0,
                    higherLow: false,
                });
            },
        }),
        {
            name: 'tech-store',
            storage: createJSONStorage(() => {
                try {
                    return require('@/utils/storage').safeStorage;
                } catch {
                    return localStorage;
                }
            }),
            partialize: (state) => ({
                enabledConditions: state.enabledConditions,
                personalParams: state.personalParams,
                reversalState: state.reversalState,
                reversalInputs: state.reversalInputs,
                conditions: state.conditions, // Persist conditions
                lastEvaluated: state.lastEvaluated,
                gateCount: state.gateCount,
                higherLow: state.higherLow,
            }),
        }
    )
);

// ============ Selectors ============

export const selectGates = (state: TechState) =>
    state.conditions.filter(c => c.group === 'Gate');

export const selectBoosters = (state: TechState) =>
    state.conditions.filter(c => c.group === 'Booster');

export const selectReversalScore = (state: TechState) =>
    state.reversalState?.finalScore ?? 0;

export const selectReversalStage = (state: TechState) =>
    state.reversalState?.stage ?? 'Bottom Break';

