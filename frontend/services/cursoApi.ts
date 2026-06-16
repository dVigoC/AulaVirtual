// ── services/cursoApi.ts ──────────────────────────────────────────────────────
import api from "./authApi";

// ── Tipos alineados con CursoDto.java ────────────────────────────────────────

export interface CursoResponse {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  creditos: number;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CursoPageResponse {
  content: CursoResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CursoFilters {
  search?: string;
  isActive?: boolean | null;
  page?: number;
  size?: number;
}

export interface CreateCursoRequest {
  codigo: string;
  nombre: string;
  descripcion?: string;
  creditos?: number;
}

export interface UpdateCursoRequest {
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  creditos?: number;
}

export interface AsignacionRequest {
  docenteId: string;
  cursoIds: string[];
  anioPeriodo: string;
}

export interface AsignacionResponse {
  id: string;
  docenteId: string;
  docenteNombre: string | null;
  docenteEmail: string;
  cursoId: string;
  cursoNombre: string;
  cursoCodigo: string;
  cursoCreditos: number;
  active: boolean;
  asignadoAt: string | null;
  asignadoPorNombre: string | null;
}

export interface DocenteConCursosResponse {
  docenteId: string;
  docenteNombre: string | null;
  docenteEmail: string;
  docenteUsername: string;
  cursos: CursoResponse[];
}

// ── Base path (sin /api porque ya está en el baseURL) ────────────────────────
const BASE = "/admin/cursos";

// ── CRUD Cursos ───────────────────────────────────────────────────────────────

export const getCursos = (filters: CursoFilters = {}) => {
  const params: Record<string, string> = {};
  if (filters.search) params.search = filters.search;
  if (filters.isActive !== null && filters.isActive !== undefined)
    params.isActive = String(filters.isActive);
  params.page = String(filters.page ?? 0);
  params.size = String(filters.size ?? 20);
  return api.get<CursoPageResponse>(BASE, { params });
};

export const getCursoById = (id: string) =>
  api.get<CursoResponse>(`${BASE}/${id}`);

export const createCurso = (data: CreateCursoRequest) =>
  api.post<CursoResponse>(BASE, data);

export const updateCurso = (id: string, data: UpdateCursoRequest) =>
  api.put<CursoResponse>(`${BASE}/${id}`, data);

export const setCursoActive = (id: string, active: boolean) =>
  api.patch<CursoResponse>(`${BASE}/${id}/status`, null, { params: { active } });

export const deleteCurso = (id: string) =>
  api.delete<void>(`${BASE}/${id}`);

// ── Asignaciones ──────────────────────────────────────────────────────────────

export const asignarCursos = (data: AsignacionRequest) =>
  api.post<AsignacionResponse[]>(`${BASE}/asignaciones`, data);

export const removerAsignacion = (asignacionId: string) =>
  api.delete<void>(`${BASE}/asignaciones/${asignacionId}`);

export const getCursosByDocente = (docenteId: string) =>
  api.get<AsignacionResponse[]>(`${BASE}/docente/${docenteId}`);

export const getDocentesConCursos = () =>
  api.get<DocenteConCursosResponse[]>(`${BASE}/docentes-con-cursos`);