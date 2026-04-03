import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { isLoggedIn } from '@/lib/auth';
import { useRouter } from 'expo-router';
import '../global.css';

export default function RootLayout() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    isLoggedIn().then((loggedIn) => {
      setChecked(true);
      if (!loggedIn) router.replace('/(auth)/login');
    });
  }, []);

  if (!checked) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
