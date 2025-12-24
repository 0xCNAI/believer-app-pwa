import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import '../global.css';

export default function RootLayout() {
    const [isReady, setIsReady] = useState(false);
    const { isAuthenticated } = useAuthStore();
    const { hasFinishedOnboarding } = useOnboardingStore();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        // Wait for hydration (simple timeout or check properties)
        // Zustand persist usually hydrates quickly, but a small delay ensures storage readiness
        const timer = setTimeout(() => setIsReady(true), 100);
        return () => clearTimeout(timer);
    }, []);

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
            <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="white" />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'black' } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" options={{ animation: 'fade' }} />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        </Stack>
    );
}
