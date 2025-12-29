import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ExperienceLevel = 'none' | '1-3_years' | '5_plus_years';

// 8 Prediction Market Topics (敘事層唯一選項)
export type PredictionTopic =
    | 'fed_rate'          // 聯準會降息預期
    | 'yield_curve'       // 殖利率曲線轉向預期
    | 'crypto_regulation' // 美國加密監管與法案進展
    | 'btc_reserve'       // 美國比特幣戰略儲備
    | 'pro_crypto_pol'    // 親加密政治結果
    | 'eth_etf'           // ETH 現貨 ETF 預期
    | 'institutional'     // 機構級加密採用
    | 'systemic_risk';    // 系統性金融風險事件

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

    resetProfile: () => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            experience: null,
            predictionTopics: [],
            focusAreas: [],
            alertStyle: null,

            setExperience: (level) => set({ experience: level }),

            togglePredictionTopic: (topic) => set((state) => {
                const isSelected = state.predictionTopics.includes(topic);
                if (isSelected) {
                    return { predictionTopics: state.predictionTopics.filter(t => t !== topic) };
                } else {
                    if (state.predictionTopics.length >= 5) return state;
                    return { predictionTopics: [...state.predictionTopics, topic] };
                }
            }),

            // Legacy
            toggleFocusArea: (area) => set((state) => {
                const isSelected = state.focusAreas.includes(area);
                if (isSelected) {
                    return { focusAreas: state.focusAreas.filter(a => a !== area) };
                } else {
                    if (state.focusAreas.length >= 3) return state;
                    return { focusAreas: [...state.focusAreas, area] };
                }
            }),

            setAlertStyle: (style) => set({ alertStyle: style }),

            resetProfile: () => set({
                experience: null,
                predictionTopics: [],
                focusAreas: [],
                alertStyle: null
            }),
        }),
        {
            name: 'user-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
