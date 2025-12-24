import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
    isAuthenticated: boolean;
    user: { id: string; name: string } | null;
    login: () => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            user: null,

            login: () => set({
                isAuthenticated: true,
                user: { id: 'u1', name: 'Believer Agent' }
            }),

            logout: () => set({
                isAuthenticated: false,
                user: null
            }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
