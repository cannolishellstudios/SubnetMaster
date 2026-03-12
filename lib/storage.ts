import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageKeys = {
  recents: 'subnetpro_recents_v1',
  favorites: 'subnetpro_favorites_v1',
  preferences: 'subnetpro_preferences_v1',
};

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveJson<T>(key: string, value: T) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no-op
  }
}