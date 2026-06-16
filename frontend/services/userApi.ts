// ── services/userApi.ts ──────────────────────────────────────────────────────
import api from "./authApi";

// ── Tipos alineados con UserDto.java ─────────────────────────────────────────
export type UserRole = "ADMIN" | "DOCENTE" | "ESTUDIANTE";

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  active: boolean;
  emailVerified: boolean;
  accountLocked: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
}

export interface PageResponse {
  content: UserResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface UserFilters {
  search?: string;
  role?: UserRole | "";
  isActive?: boolean | null;
  page?: number;
  size?: number;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  fullName?: string;
  role?: UserRole;
}

// ── Funciones de API ──────────────────────────────────────────────────────────

export const getUsers = (filters: UserFilters = {}) => {
  const params: Record<string, string> = {};
  if (filters.search) params.search = filters.search;
  if (filters.role) params.role = filters.role;
  if (filters.isActive !== null && filters.isActive !== undefined)
    params.isActive = String(filters.isActive);
  params.page = String(filters.page ?? 0);
  params.size = String(filters.size ?? 10);
  return api.get<PageResponse>("/admin/users", { params });
};

export const getUserById = (id: string) =>
  api.get<UserResponse>(`/admin/users/${id}`);

export const createUser = (data: CreateUserRequest) =>
  api.post<UserResponse>("/admin/users", data);

export const updateUser = (id: string, data: UpdateUserRequest) =>
  api.put<UserResponse>(`/admin/users/${id}`, data);

// FIX: Se agrega console.log para depuración en desarrollo.
// Si el backend serializa "isActive" en vez de "active", el interceptor
// de authApi.ts lo normaliza antes de llegar aquí.
export const setUserStatus = (id: string, isActive: boolean) =>
  api
    .patch<UserResponse>(`/admin/users/${id}/status`, null, {
      params: { isActive },
    })
    .then((res) => {
      console.log("STATUS:", res.status, JSON.stringify(res.data));
      return res;
    })
    .catch((err) => {
      console.log(
        "ERROR:",
        err?.response?.status,
        JSON.stringify(err?.response?.data),
      );
      throw err;
    });

export const unlockUser = (id: string) =>
  api.patch<UserResponse>(`/admin/users/${id}/unlock`);

export const resetUserPassword = (id: string, newPassword: string) =>
  api.patch<void>(`/admin/users/${id}/password`, { newPassword });

export const deleteUser = (id: string) =>
  api.delete<void>(`/admin/users/${id}`);

// Añadir a services/userApi.ts o al archivo correspondiente MODULO PERFIL:

export async function getMyProfile() {
  // Asumiendo que tu Axios / Fetch instance ya inyecta el Bearer Token desde el tokenStorage
  return api.get<UserResponse>("/profile");
}

export async function updateMyProfile(data: {
  username: string;
  email: string;
  fullName: string;
}) {
  return api.put<UserResponse>("/profile", data);
}

export async function changeMyPassword(password: string) {
  return api.patch<void>("/profile/password", { newPassword: password });
  // ↑ también cambia "password" → "newPassword" para alinearlo con tu DTO Java
}
