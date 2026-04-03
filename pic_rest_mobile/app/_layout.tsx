import { useEffect, useState } from 'react';
import { Stack, useRouter, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { isLoggedIn } from '@/lib/auth';
import '../global.css';

export default function RootLayout() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const [authState, setAuthState] = useState<'loading' | 'authed' | 'unauthed'>('loading');

  useEffect(() => {
    isLoggedIn().then((loggedIn) => {
      setAuthState(loggedIn ? 'authed' : 'unauthed');
    });
  }, []);

  useEffect(() => {
    // Wait until the navigator is ready before attempting navigation
    if (!navigationState?.key) return;
    if (authState === 'unauthed') {
      router.replace('/(auth)/login');
    } else if (authState === 'authed') {
      router.replace('/(app)/menu');
    }
  }, [navigationState?.key, authState]);

  if (authState === 'loading') return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
