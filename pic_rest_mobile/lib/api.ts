import axios from 'axios';
import { getToken, clearToken } from './auth';
import type { Dish, Menu, SafeSettings, AppSettings, UserProfile, GalleryGroup } from './types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const client = axios.create({ baseURL: BASE_URL });

// Attach token to every request
client.interceptors.request.use(async (config) => {
  try {
    const token = await getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // SecureStore unavailable (e.g. device locked) — proceed without token; server will 401
  }
  return config;
});

// On 401 — clear token (session expired)
client.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) await clearToken();
    return Promise.reject(err);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(phone: string): Promise<{ userId: string; token: string; phone: string }> {
  const { data } = await client.post('/api/auth/login', { phone });
  return data.data;
}

export async function getMe(): Promise<{ userId: string; phone: string }> {
  const { data } = await client.get('/api/auth/me');
  return data.data;
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<UserProfile> {
  const { data } = await client.get('/api/auth/profile');
  return data.data;
}

export async function updateProfile(payload: {
  restaurantName?: string;
  restaurantLogo?: string | null;
  restaurantStyle?: string;
}): Promise<Partial<UserProfile>> {
  const { data } = await client.put('/api/auth/profile', payload);
  return data.data;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<SafeSettings> {
  const { data } = await client.get('/api/settings');
  return data.data;
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<SafeSettings> {
  const { data } = await client.post('/api/settings', settings);
  return data.data;
}

// ─── Menus ───────────────────────────────────────────────────────────────────

export async function getMenus(): Promise<Menu[]> {
  const { data } = await client.get('/api/menus');
  return data.data;
}

export async function deleteMenu(menuId: string): Promise<void> {
  await client.delete(`/api/menus/${menuId}`);
}

// ─── Parse ───────────────────────────────────────────────────────────────────

export async function parseMenuText(menuText: string, styleKey?: string): Promise<{ menuId: string; dishCount: number }> {
  const { data } = await client.post('/api/menu/parse', { menuText, styleKey });
  return data.data;
}

export async function parseMenuImage(menuImage: string, styleKey?: string): Promise<{ menuId: string; dishCount: number }> {
  const { data } = await client.post('/api/menu/parse-image', { menuImage, styleKey });
  return data.data;
}

// ─── Dishes ──────────────────────────────────────────────────────────────────

export async function getDishes(menuId: string): Promise<{ menuId: string; menuName: string; styleKey: string | null; dishes: Dish[] }> {
  const { data } = await client.get('/api/dishes', { params: { menuId } });
  return data.data;
}

export async function getDish(dishId: string): Promise<Dish> {
  const { data } = await client.get(`/api/dishes/${dishId}`);
  return data.data;
}

export async function updateDish(dishId: string, payload: Partial<Pick<Dish, 'name' | 'description' | 'price' | 'category' | 'ingredients' | 'prompt'>>): Promise<Dish> {
  const { data } = await client.patch(`/api/dishes/${dishId}`, payload);
  return data.data;
}

export async function deleteDish(dishId: string): Promise<void> {
  await client.delete(`/api/dishes/${dishId}`);
}

export async function uploadReferenceImage(
  dishId: string,
  imageUri: string,
  mimeType = 'image/jpeg',
): Promise<{ referenceImage: string }> {
  const formData = new FormData();
  formData.append('image', { uri: imageUri, name: 'reference.jpg', type: mimeType } as unknown as Blob);
  const { data } = await client.post(`/api/dishes/${dishId}/reference`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  // Return the server-persisted base64 so callers don't keep a transient local URI
  return data.data as { referenceImage: string };
}

export async function deleteReferenceImage(dishId: string): Promise<void> {
  await client.delete(`/api/dishes/${dishId}/reference`);
}

// ─── Generate ────────────────────────────────────────────────────────────────

export async function generateDish(dishId: string): Promise<void> {
  await client.post(`/api/generate/${dishId}`);
}

export async function generateAll(menuId: string): Promise<{ queued: number }> {
  const { data } = await client.post('/api/generate/all', { menuId });
  return data.data;
}

// ─── Gallery ─────────────────────────────────────────────────────────────────

export async function getGallery(): Promise<{ groups: GalleryGroup[] }> {
  const { data } = await client.get('/api/gallery');
  return data.data;
}

export function getImageUrl(dishId: string): string {
  return `${BASE_URL}/api/images/${dishId}`;
}

// ─── Restaurant ──────────────────────────────────────────────────────────────

export async function getRestaurant() {
  const { data } = await client.get('/api/restaurant');
  return data.data;
}
