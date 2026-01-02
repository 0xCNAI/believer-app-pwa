import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AIState {
    analysis: string | null;
    lastUpdated: number | null; // Timestamp in ms
    isAnalyzing: boolean;
    setAnalysis: (text: string) => void;
    setAnalyzing: (status: boolean) => void;
    clearAnalysis: () => void;
}

export const useAIStore = create<AIState>()(
    persist(
        (set) => ({
            analysis: null,
            lastUpdated: null,
            isAnalyzing: false,
            setAnalysis: (text) => set({ analysis: text, lastUpdated: Date.now() }),
            setAnalyzing: (status) => set({ isAnalyzing: status }),
            clearAnalysis: () => set({ analysis: null, lastUpdated: null }),
        }),
        {
            name: 'ai-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
