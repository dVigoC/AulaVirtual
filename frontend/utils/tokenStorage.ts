// ── utils\tokenStorage.ts ─────────────────────────────────────────────
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "aula_access_token";
const USER_KEY = "aula_user";

// SecureStore no funciona en web, usamos localStorage como fallback
const save = async (key: string, value: string) => {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const get = async (key: string): Promise<string | null> => {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
};

const remove = async (key: string) => {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

export const saveToken = (token: string) => save(TOKEN_KEY, token);
export const getToken = () => get(TOKEN_KEY);
export const removeToken = () => remove(TOKEN_KEY);

export const saveUser = (user: object) => save(USER_KEY, JSON.stringify(user));
export const getUser = async () => {
  const raw = await get(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};
export const removeUser = () => remove(USER_KEY);

export const clearSession = async () => {
  await removeToken();
  await removeUser();
};
