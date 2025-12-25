import { auth } from '@/services/firebase';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type UserRole = 'admin' | 'user';

interface User {
    id: string;
    name: string;
    email?: string;
    role: UserRole;
}

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    isLoading: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    hasRole: (role: UserRole) => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => {
            // Initialize Auth Listener
            onAuthStateChanged(auth, (firebaseUser) => {
                if (firebaseUser) {
                    set({
                        isAuthenticated: true,
                        user: {
                            id: firebaseUser.uid,
                            name: firebaseUser.displayName || 'User',
                            email: firebaseUser.email || undefined,
                            role: 'user' // Default to user, admin logic can be added later
                        },
                        isLoading: false
                    });
                } else {
                    set({ isAuthenticated: false, user: null, isLoading: false });
                }
            });

            return {
                isAuthenticated: false,
                user: null,
                isLoading: true,
                login: async () => {
                    try {
                        set({ isLoading: true });
                        const provider = new GoogleAuthProvider();
                        await signInWithPopup(auth, provider);
                        // State update handled by onAuthStateChanged
                    } catch (error) {
                        console.error("Login Failed:", error);
                        set({ isLoading: false });
                        throw error;
                    }
                },
                logout: async () => {
                    try {
                        await signOut(auth);
                        set({ isAuthenticated: false, user: null });
                    } catch (error) {
                        console.error("Logout Failed:", error);
                    }
                },
                hasRole: (requiredRole) => {
                    const { user } = get();
                    if (!user) return false;
                    if (user.role === 'admin') return true; // Admin has all permissions
                    return user.role === requiredRole;
                }
            };
        },
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => require('@/utils/storage').safeStorage),
            partialize: (state) => ({}), // Don't persist auth state, rely on Firebase SDK
        }
    )
);
