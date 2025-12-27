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
    fetchAndEvaluate: () => Promise<void>;
    resetToDefaults: () => void;
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
                set((state) => ({
                    enabledConditions: {
                        ...state.enabledConditions,
                        [id]: enabled,
                    },
                }));
            },

            setPersonalParam: (key, value) => {
                set((state) => ({
                    personalParams: {
                        ...state.personalParams,
                        [key]: value,
                    },
                }));
            },

            fetchAndEvaluate: async () => {
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
                    const [techResults, realData] = await Promise.all([
                        evaluateTechConditions(enabledIds, personalParams),
                        fetchAllRealData()
                    ]);

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

                    // Get Belief Points (Need to access beliefStore safely)
                    let beliefPoints = 0;
                    try {
                        const beliefState = require('./beliefStore').useBeliefStore.getState();
                        const beliefs = beliefState.beliefs || [];
                        if (beliefs.length > 0) {
                            // Current Logic: avg prob * 0.25 (25 pts max)
                            const avgProb = beliefs.reduce((sum: number, b: any) => sum + b.currentProbability, 0) / beliefs.length;
                            beliefPoints = avgProb * 0.25;
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

                    console.log('[TechStore] Calculating Reversal with:', inputs);

                    // 3. Calculate Dual-Track Reversal State
                    const reversalState = calculateReversalState(inputs, activeBoosters);

                    // 4. Persistence & Diff Check (Edge Trigger Notification)
                    try {
                        const { useAuthStore } = require('./authStore');
                        const user = useAuthStore.getState().user;

                        if (user?.uid) { // Ensure using 'uid' or 'id' consistent with your auth store
                            const { syncStateAndCheckDiff } = require('@/services/statePersistence');

                            // Running in background to not block UI? 
                            // Or await if we want to show toast immediately?
                            // Let's await to be safe.
                            syncStateAndCheckDiff({ id: user.uid, email: user.email }, reversalState).then((result: any) => {
                                if (result.hasChanged && result.notifications.length > 0) {
                                    console.log('[Notifier]', result.notifications);
                                    // TODO: Trigger UI Toast/Alert here if needed
                                    // e.g. useToast.getState().show(...) 
                                }
                            });
                        }
                    } catch (e) {
                        console.warn('[TechStore] Persistence check skipped:', e);
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

