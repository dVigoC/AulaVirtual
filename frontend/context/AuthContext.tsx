// ── context\AuthContext.tsx ─────────────────────────────────────────────
import { createContext, ReactNode, useEffect, useState } from "react";
import { loginApi } from "../services/authApi";
import {
  clearSession,
  getToken,
  getUser,
  saveToken,
  saveUser,
} from "../utils/tokenStorage";

// Actualizamos la interfaz para incluir el estado del usuario de forma segura
interface UserInfo {
  email: string;
  role: "ADMIN" | "DOCENTE" | "ESTUDIANTE";
  fullName: string;
  isActive: boolean; // Agregado para que esté disponible en toda la app
}

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  loading: boolean;
  loginLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<"ADMIN" | "DOCENTE" | "ESTUDIANTE" | null>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const restore = async () => {
      const [savedToken, savedUser] = await Promise.all([
        getToken(),
        getUser(),
      ]);
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(savedUser as UserInfo);
      }
      setLoading(false);
    };
    restore();
  }, []);

  const login = async (email: string, password: string) => {
    setLoginLoading(true);
    setError(null);
    try {
      const response = await loginApi(email, password);

      // Forzamos a 'data' como 'any' para que TypeScript no chille por 'isActive'
      const data = response.data as any;

      // Ahora TypeScript te dejará compilar sin errores de tipo
      const backendActive =
        data.isActive !== undefined ? data.isActive : data.active;

      const userData: UserInfo = {
        email: data.email,
        role: data.role,
        fullName: data.fullName,
        isActive: backendActive ?? true, // Si por alguna razón viene nulo, por defecto es true
      };

      await saveToken(data.accessToken);
      await saveUser(userData);

      setToken(data.accessToken);
      setUser(userData);

      return data.role;
    } catch (err: any) {
      const msg = err.response?.data?.error ?? "Credenciales incorrectas";
      setError(msg);
      return null;
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = async () => {
    await clearSession();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        loginLoading,
        error,
        isAuthenticated: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
