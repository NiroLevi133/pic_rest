import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'restorante_token';
const PHONE_KEY = 'restorante_phone';

export async function saveToken(token: string, phone: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(PHONE_KEY, phone);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getPhone(): Promise<string | null> {
  return SecureStore.getItemAsync(PHONE_KEY);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(PHONE_KEY);
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}
