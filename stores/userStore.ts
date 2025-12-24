import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ExperienceLevel = 'none' | '1-3_years' | '5_plus_years';
export type FocusArea = 'macro' | 'extreme_repair' | 'btc_structure' | 'policy' | 'low_prob';
export type AlertStyle = 'early' | 'balanced' | 'late';

interface UserState {
    experience: ExperienceLevel | null;
    focusAreas: FocusArea[];
    alertStyle: AlertStyle | null;

    setExperience: (level: ExperienceLevel) => void;
    toggleFocusArea: (area: FocusArea) => void;
    setAlertStyle: (style: AlertStyle) => void;

    resetProfile: () => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            experience: null,
            focusAreas: [],
            alertStyle: null,

            setExperience: (level) => set({ experience: level }),
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
