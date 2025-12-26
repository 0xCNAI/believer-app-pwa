/**
 * Tech Store - Technical Analysis State Management
 * 
 * Manages user configurations and evaluation results
 * for the technical analysis engine.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
    evaluateTechConditions,
    CONDITION_DEFS,
    PersonalParams,
    DEFAULT_PERSONAL_PARAMS,
    ConditionResult,
    TechEvaluationResult,
} from '@/services/techEngine';
import { calculatePhase, PhaseResult, RiskModifiers, fetchRiskModifiers } from '@/services/phaseEngine';

// ============ Types ============

interface TechState {
    // User Settings
    enabledConditions: Record<string, boolean>;
    personalParams: PersonalParams;

    // Evaluation Results
    conditions: ConditionResult[];
    phaseResult: PhaseResult | null;
    riskModifiers: RiskModifiers | null;
    lastEvaluated: number;
    isLoading: boolean;
    error: string | null;

    // Actions
    setConditionEnabled: (id: string, enabled: boolean) => void;
    setPersonalParam: <K extends keyof PersonalParams>(key: K, value: PersonalParams[K]) => void;
    evaluateAll: () => Promise<void>;
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
            phaseResult: null,
            riskModifiers: null,
            lastEvaluated: 0,
            isLoading: false,
            error: null,

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

            evaluateAll: async () => {
                set({ isLoading: true, error: null });

                try {
                    const { enabledConditions, personalParams } = get();

                    // Get enabled condition IDs
                    const enabledIds = Object.entries(enabledConditions)
                        .filter(([_, enabled]) => enabled)
                        .map(([id]) => id);

                    // Fetch Risk Modifiers and evaluate conditions in parallel
                    const [result, riskModifiers] = await Promise.all([
                        evaluateTechConditions(enabledIds, personalParams),
                        fetchRiskModifiers(),
                    ]);

                    // Calculate phase with risk modifiers
                    const phaseResult = calculatePhase(result.conditions, riskModifiers);

                    set({
                        conditions: result.conditions,
                        phaseResult,
                        riskModifiers,
                        lastEvaluated: result.dataTimestamp,
                        isLoading: false,
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
                // Use same safe storage as beliefStore
                try {
                    return require('@/utils/storage').safeStorage;
                } catch {
                    return localStorage;
                }
            }),
            // Only persist user settings, not evaluation results
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

export const selectTechScore = (state: TechState) =>
    state.phaseResult?.techScore ?? 0;

export const selectPhase = (state: TechState) =>
    state.phaseResult?.phase ?? 'Accumulation';

export const selectCap = (state: TechState) =>
    state.phaseResult?.adjustedCap ?? 60;
