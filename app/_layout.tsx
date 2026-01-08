import { useAuthStore } from '@/stores/authStore';
import { useBeliefStore } from '@/stores/beliefStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import '../global.css';

export default function RootLayout() {
    const [isReady, setIsReady] = useState(false);
    const { isAuthenticated, user } = useAuthStore();
    const { hasFinishedOnboarding } = useOnboardingStore();
    const { syncBeliefs } = useBeliefStore();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        // Wait for hydration (simple timeout or check properties)
        // Zustand persist usually hydrates quickly, but a small delay ensures storage readiness
        const timer = setTimeout(() => setIsReady(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Sync Beliefs when User ID changes
    useEffect(() => {
        if (user?.id) {
            const unsubscribe = syncBeliefs(user.id);
            return () => unsubscribe();
        }
    }, [user?.id]);

    useEffect(() => {
        if (!isReady) return;

        const inAuthGroup = segments[0] === '(tabs)';
        const inOnboarding = segments[0] === 'onboarding';
        const inLogin = segments[0] === 'login';

        if (!isAuthenticated) {
            if (!inLogin) {
                router.replace('/login');
            }
        } else if (isAuthenticated && !hasFinishedOnboarding) {
            if (!inOnboarding) {
                router.replace('/onboarding');
            }
        } else if (isAuthenticated && hasFinishedOnboarding) {
            // Logged in + Onboarded
            if (inLogin || inOnboarding) {
                router.replace('/');
            }
        }

    }, [isReady, isAuthenticated, hasFinishedOnboarding, segments]);

    if (!isReady) {
        return (
            <View style={{ flex: 1, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="white" />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#1F2937' } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" options={{ animation: 'fade' }} />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        </Stack>
    );
}
