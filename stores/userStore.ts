import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ExperienceLevel = 'none' | '1-3_years' | '5_plus_years';

// 5 Prediction Topics (V3.0 - Consolidated)
export type PredictionTopic =
    | 'monetary_policy'      // Fed 路徑
    | 'macro_downturn'       // Recession / GDP
    | 'fiscal_credit'        // Shutdown / Default
    | 'sovereign_btc'        // BTC Reserve
    | 'financial_stability'; // Bank failure (optional)

export type AlertStyle = 'early' | 'balanced' | 'late';

// Legacy type for backward compatibility (will be removed)
export type FocusArea = 'macro' | 'extreme_repair' | 'btc_structure' | 'policy' | 'low_prob';

interface UserState {
    experience: ExperienceLevel | null;

    // New: 8 Prediction Market Topics
    predictionTopics: PredictionTopic[];

    // Legacy: kept for backward compatibility
    focusAreas: FocusArea[];

    alertStyle: AlertStyle | null;

    setExperience: (level: ExperienceLevel) => void;

    // New: toggle prediction topics (max 5)
    togglePredictionTopic: (topic: PredictionTopic) => void;

    // Legacy: kept for backward compatibility
    toggleFocusArea: (area: FocusArea) => void;

    setAlertStyle: (style: AlertStyle) => void;

    notificationSettings: {
        phaseTransitions: boolean;
        newIndicators: boolean;
        extremeDynamics: boolean;
    };

    setNotificationSetting: (key: keyof UserState['notificationSettings'], value: boolean) => void;

    resetProfile: () => void;

    completeSystemReset: () => Promise<void>;

    syncFromCloud: (uid: string) => Promise<void>;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            experience: null,
            predictionTopics: [],
            focusAreas: [],
            alertStyle: null,
            notificationSettings: {
                phaseTransitions: true,
                newIndicators: true,
                extremeDynamics: true,
            },

            setExperience: (level) => set({ experience: level }),

            togglePredictionTopic: (topic) => {
                set((state) => {
                    const isSelected = state.predictionTopics.includes(topic);
                    let newTopics;
                    if (isSelected) {
                        newTopics = state.predictionTopics.filter(t => t !== topic);
                    } else {
                        if (state.predictionTopics.length >= 3) return state; // No change
                        newTopics = [...state.predictionTopics, topic];
                    }

                    // Cloud Sync
                    try {
                        const { useAuthStore } = require('./authStore');
                        const uid = useAuthStore.getState().user?.id;
                        if (uid) {
                            require('@/services/statePersistence').saveUserConfig(uid, { predictionTopics: newTopics });
                        }
                    } catch (e) { }

                    return { predictionTopics: newTopics };
                });
            },

            toggleFocusArea: (area) => set((state) => {
                // Legacy - no sync needed
                const isSelected = state.focusAreas.includes(area);
                if (isSelected) return { focusAreas: state.focusAreas.filter(a => a !== area) };
                if (state.focusAreas.length >= 3) return state;
                return { focusAreas: [...state.focusAreas, area] };
            }),

            setAlertStyle: (style) => set({ alertStyle: style }),

            setNotificationSetting: (key, value) => {
                set((state) => {
                    const newSettings = {
                        ...state.notificationSettings,
                        [key]: value
                    };

                    // Cloud Sync
                    try {
                        const { useAuthStore } = require('./authStore');
                        const uid = useAuthStore.getState().user?.id;
                        if (uid) {
                            require('@/services/statePersistence').saveUserConfig(uid, { notificationSettings: newSettings });
                        }
                    } catch (e) { }

                    return { notificationSettings: newSettings };
                });
            },

            resetProfile: () => set({
                experience: null,
                predictionTopics: [],
                focusAreas: [],
                alertStyle: null,
                notificationSettings: {
                    phaseTransitions: true,
                    newIndicators: true,
                    extremeDynamics: true,
                }
            }),

            completeSystemReset: async () => {
                console.log('[UserStore] Initiating Complete System Reset...');

                // 1. Reset Local Stores (Zustand)
                get().resetProfile();

                try {
                    const { useTechStore } = require('./techStore');
                    useTechStore.getState().resetToDefaults();
                    console.log('[UserStore] TechStore reset.');
                } catch (e) {
                    console.warn('[UserStore] Failed to reset TechStore:', e);
                }

                try {
                    const { useBeliefStore } = require('./beliefStore');
                    useBeliefStore.getState().resetStore();
                    console.log('[UserStore] BeliefStore reset.');
                } catch (e) {
                    console.warn('[UserStore] Failed to reset BeliefStore:', e);
                }

                // 2. Clear Async Storage (Persistence)
                try {
                    await AsyncStorage.clear();
                    console.log('[UserStore] AsyncStorage cleared completely.');
                } catch (e) {
                    console.error('[UserStore] Failed to clear AsyncStorage:', e);
                }

                // 3. Force Reload (Optional, but ensures clean slate)
                // if (Platform.OS === 'web') window.location.reload();
            },

            // Action to load from cloud
            syncFromCloud: async (uid: string) => {
                try {
                    const config = await require('@/services/statePersistence').loadUserConfig(uid);
                    if (config) {
                        set((state) => ({
                            predictionTopics: config.predictionTopics || state.predictionTopics,
                            notificationSettings: config.notificationSettings || state.notificationSettings,
                        }));
                        console.log('[UserStore] Synced from cloud');
                    }
                } catch (e) { console.warn('Sync failed', e); }
            }
        }),
        {
            name: 'user-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
