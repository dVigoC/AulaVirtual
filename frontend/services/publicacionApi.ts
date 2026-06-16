// ── services/publicacionApi.ts ───────────────────────────────────────────────
import api from "./authApi";

// ═══════════════════════════════════════════════════════════════
//  TIPOS
// ═══════════════════════════════════════════════════════════════

export type PublicacionTipo =
  | "CLASE_VIRTUAL"
  | "TAREA"
  | "MATERIAL_CLASE"
  | "EVALUACION"
  | "ANUNCIO_GENERAL"
  | "CONTENIDO_INMEDIATO";

export interface CursoInicioResponse {
  cursoId: string;
  cursoCodigo: string;
  cursoNombre: string;
  descripcion: string | null;
  creditos: number;
  anioPeriodo: string;
  portadaUrl: string | null;
  docenteNombre: string | null;
  totalEstudiantes: number;
  esDocente: boolean;
}

export interface PublicacionResponse {
  id: string;
  cursoId: string;
  cursoNombre: string;
  docenteId: string;
  docenteNombre: string | null;
  tipo: PublicacionTipo;
  titulo: string | null;
  descripcion: string | null;
  anioPeriodo: string;

  // Clase virtual
  linkReunion: string | null;
  fechaClase: string | null;

  // Archivo
  archivoUrl: string | null;
  archivoNombre: string | null;
  archivoTipo: string | null;

  // Tarea / Evaluación
  fechaLimite: string | null;
  permitirEnvioTardio: boolean;

  // Anuncio / Contenido Inmediato
  fechaInicio: string | null;
  fechaFin: string | null;

  createdAt: string;
  updatedAt: string;

  // Calculados según el caller
  totalEntregas?: number | null; // docente/admin
  entregado?: boolean | null; // estudiante
  vencida?: boolean | null;
}

export interface CreatePublicacionRequest {
  cursoId: string;
  tipo: PublicacionTipo;
  titulo?: string;
  descripcion?: string;
  anioPeriodo?: string;
  linkReunion?: string;
  fechaClase?: string;
  archivoUrl?: string;
  archivoNombre?: string;
  archivoTipo?: string;
  fechaLimite?: string;
  permitirEnvioTardio?: boolean;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface EntregaResponse {
  id: string;
  publicacionId: string;
  estudianteId: string;
  estudianteNombre: string | null;
  estudianteEmail: string;
  archivoUrl: string | null;
  archivoNombre: string | null;
  archivoTipo: string | null;
  linkEntrega: string | null;
  comentario: string | null;
  entregadoAt: string;
  updatedAt: string;
}

export interface CreateEntregaRequest {
  publicacionId: string;
  archivoUrl?: string;
  archivoNombre?: string;
  archivoTipo?: string;
  linkEntrega?: string;
  comentario?: string;
}

export interface PortadaResponse {
  id: string;
  cursoId: string;
  imagenUrl: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════
//  ENDPOINTS — alineados con /api/inicio (PublicacionController)
// ═══════════════════════════════════════════════════════════════

const BASE = "/inicio";

/** GET /api/inicio/cursos — cursos del período actual para el usuario autenticado */
export const getCursosInicio = () =>
  api.get<CursoInicioResponse[]>(`${BASE}/cursos`);

/** GET /api/inicio/cursos/{cursoId}/publicaciones?periodo=2026-I */
export const getPublicaciones = (cursoId: string, periodo?: string) =>
  api.get<PublicacionResponse[]>(`${BASE}/cursos/${cursoId}/publicaciones`, {
    params: periodo ? { periodo } : undefined,
  });

/** POST /api/inicio/publicaciones — docente / admin */
export const createPublicacion = (data: CreatePublicacionRequest) =>
  api.post<PublicacionResponse>(`${BASE}/publicaciones`, data);

/** DELETE /api/inicio/publicaciones/{id} — docente / admin */
export const deletePublicacion = (id: string) =>
  api.delete<void>(`${BASE}/publicaciones/${id}`);

/** PATCH /api/inicio/publicaciones/{id}/permiso-tardio — docente / admin */
export const updatePermisoTardio = (id: string, permitir: boolean) =>
  api.patch<PublicacionResponse>(`${BASE}/publicaciones/${id}/permiso-tardio`, {
    permitirEnvioTardio: permitir,
  });

/** GET /api/inicio/publicaciones/{id}/entregas — docente / admin */
export const getEntregas = (publicacionId: string) =>
  api.get<EntregaResponse[]>(`${BASE}/publicaciones/${publicacionId}/entregas`);

/** POST /api/inicio/entregas — estudiante (upsert) */
export const crearEntrega = (data: CreateEntregaRequest) =>
  api.post<EntregaResponse>(`${BASE}/entregas`, data);

/** PUT /api/inicio/cursos/{cursoId}/portada — docente / admin */
export const updatePortada = (cursoId: string, imagenUrl: string) =>
  api.put<PortadaResponse>(`${BASE}/cursos/${cursoId}/portada`, { imagenUrl });
