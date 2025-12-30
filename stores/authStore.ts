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
    updateProfile: (name: string) => Promise<void>;
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
                updateProfile: async (name: string) => {
                    const { user } = get();
                    if (!user) return;

                    try {
                        // 1. Update Firebase Auth Profile (Optional, if we want sync)
                        // await updateProfile(auth.currentUser!, { displayName: name });

                        // 2. Update Firestore User Doc
                        const { db } = require('@/services/firebase');
                        const { doc, updateDoc } = require('firebase/firestore');
                        await updateDoc(doc(db, 'users', user.id), { displayName: name });

                        // 3. Update Local State
                        set({ user: { ...user, name } });
                    } catch (e) {
                        console.error("Profile Update Failed:", e);
                        throw e;
                    }
                },
                logout: async () => {
                    try {
                        await signOut(auth);
                        set({ isAuthenticated: false, user: null });

                        // Reset other stores
                        try {
                            // Use try-catch for external store resets to avoid crashes if stores not init
                            require('./beliefStore').useBeliefStore.getState().resetStore();
                            require('./userStore').useUserStore.getState().resetProfile();
                        } catch (e) {
                            console.warn("Store reset failed:", e);
                        }
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
