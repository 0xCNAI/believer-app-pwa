import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, Redirect, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useAuthStore } from '@/stores/authStore';
import { View } from 'react-native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);

  const { hasFinishedOnboarding } = useOnboardingStore();
  const { isAuthenticated } = useAuthStore();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Simulate loading or just hide splash screen
    const prepare = async () => {
      try {
        // Pre-load logic if any
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
        SplashScreen.hideAsync();
      }
    };
    prepare();
  }, []);

  if (!isReady) {
    return null;
  }

  // Early return if navigation state is not ready (prevents layout errors)
  if (!navigationState?.key) return null;

  // Protection Logic
  const inAuthGroup = segments[0] === '(tabs)';
  const inOnboarding = segments[0] === 'onboarding';
  const inLogin = segments[0] === 'login';

  // 1. Not Authenticated -> Redirect to Login
  if (!isAuthenticated && !inLogin) {
    return <Redirect href="/login" />;
  }

  // 2. Authenticated but In Login -> Redirect to app flow
  if (isAuthenticated && inLogin) {
    // Check onboarding
    if (!hasFinishedOnboarding) {
      return <Redirect href="/onboarding" />;
    } else {
      return <Redirect href="/" />;
    }
  }

  // 3. Authenticated check Onboarding
  if (isAuthenticated && !hasFinishedOnboarding && !inOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  // 4. Authenticated & Onboarded -> prevent going back to Onboarding/Login manually
  if (isAuthenticated && hasFinishedOnboarding && (inOnboarding || inLogin)) {
    return <Redirect href="/" />;
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="moment" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="tech-config" options={{ presentation: 'card', headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
