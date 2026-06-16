// ── services\authApi.ts ─────────────────────────────────────────────
import axios from "axios";
import { Platform } from "react-native";
import { getToken } from "../utils/tokenStorage";

// Detecta automáticamente si estás en emulador de Android o dispositivo físico/iOS
const getDevelopmentUrl = () => {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8080/api";
  }
  return "http://localhost:8080/api";
};

// FUNCIÓN CORREGIDA: Asegura que la URL de producción también lleve el prefijo /api
const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    // Si por alguna razón ya termina en /api, la deja igual; si no, se lo agrega
    return process.env.EXPO_PUBLIC_API_URL.endsWith("/api")
      ? process.env.EXPO_PUBLIC_API_URL
      : `${process.env.EXPO_PUBLIC_API_URL}/api`;
  }
  return getDevelopmentUrl();
};

const api = axios.create({
  baseURL: getBaseUrl(), // 👈 Ahora usa la función inteligente
});

// ── Interceptor de RESPONSE: normaliza campos del backend ────────────────────
// Lombok con "boolean isActive" puede serializar el campo como "isActive" en
// lugar de "active". Este interceptor lo normaliza antes de que llegue
// a cualquier componente del frontend.
const normalizeUser = (obj: any): any => {
  if (!obj || typeof obj !== "object") return obj;
 
  // Si tiene "isActive" pero no "active", renombrarlo
  if ("isActive" in obj && !("active" in obj)) {
    obj.active = obj.isActive;
    delete obj.isActive;
  }
 
  // Normalizar recursivamente arrays (ej: content: [...])
  if (Array.isArray(obj.content)) {
    obj.content = obj.content.map(normalizeUser);
  }
 
  return obj;
};

// Interceptor de REQUEST — adjunta JWT
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ✅ Interceptor de RESPONSE — normaliza isActive → active (FALTABA ESTO)
api.interceptors.response.use((response) => {
  response.data = normalizeUser(response.data);
  return response;
});

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  role: "ADMIN" | "DOCENTE" | "ESTUDIANTE";
  email: string;
  fullName: string;
}

export const loginApi = (email: string, password: string) =>
  api.post<LoginResponse>("/auth/login", { email, password });

export default api;
