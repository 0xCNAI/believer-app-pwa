import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
    hasFinishedOnboarding: boolean;
    completeOnboarding: () => void;
    resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
    persist(
        (set) => ({
            hasFinishedOnboarding: false,
            completeOnboarding: () => set({ hasFinishedOnboarding: true }),
            resetOnboarding: () => set({ hasFinishedOnboarding: false }),
        }),
        {
            name: 'onboarding-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
