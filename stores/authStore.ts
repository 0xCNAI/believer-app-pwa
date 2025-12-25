import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type UserRole = 'admin' | 'user';

export interface User {
    id: string;
    name: string;
    role: UserRole;
}

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    login: (role?: UserRole) => void;
    logout: () => void;
    hasRole: (role: UserRole) => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            isAuthenticated: false,
            user: null,

            login: (role: UserRole = 'user') => set({
                isAuthenticated: true,
                user: { id: 'u1', name: 'Believer Agent', role }
            }),

            logout: () => set({
                isAuthenticated: false,
                user: null
            }),

            hasRole: (requiredRole: UserRole) => {
                const { user } = get();
                if (!user) return false;
                // Admin has access to everything
                if (user.role === 'admin') return true;
                // Users only have access to user role
                return user.role === requiredRole;
            }
        }),

        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
