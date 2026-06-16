// ── services/evaluacionApi.ts ─────────────────────────────────────────────────
import api from "./authApi";
import { PublicacionTipo } from "./publicacionApi";

// ═══════════════════════════════════════════════════════════════
//  TIPOS
// ═══════════════════════════════════════════════════════════════

export interface RegistrarNotaRequest {
  publicacionId: string;
  estudianteId:  string;
  nota:          number;       // 0.00 – 20.00
  comentario?:   string;
}

export interface NotaResponse {
  id:                  string;
  publicacionId:       string;
  publicacionTitulo:   string | null;
  publicacionTipo:     PublicacionTipo;
  estudianteId:        string;
  estudianteNombre:    string | null;
  estudianteEmail:     string;
  registradoPorId:     string | null;
  registradoPorNombre: string | null;
  nota:                number;
  comentario:          string | null;
  createdAt:           string;
  updatedAt:           string;
}

export interface EstudianteNotaItem {
  estudianteId:     string;
  estudianteNombre: string | null;
  estudianteEmail:  string;
  notaId:           string | null;
  nota:             number | null;
  comentario:       string | null;
  entregado:        boolean;
  notaAt:           string | null;
}

export interface PublicacionConNotasResponse {
  publicacionId:    string;
  titulo:           string | null;
  tipo:             PublicacionTipo;
  anioPeriodo:      string;
  fechaLimite:      string | null;
  totalMatriculados: number;
  totalCalificados: number;
  estudiantes:      EstudianteNotaItem[];
}

export interface PublicacionResumenItem {
  publicacionId:    string;
  titulo:           string | null;
  tipo:             PublicacionTipo;
  fechaLimite:      string | null;
  totalMatriculados: number;
  totalCalificados: number;
  totalEntregas:    number;
}

export interface CursoEvaluacionResponse {
  cursoId:           string;
  cursoCodigo:       string;
  cursoNombre:       string;
  anioPeriodo:       string;
  totalPublicaciones: number;
  publicaciones:     PublicacionResumenItem[];
}

export interface CalificacionItem {
  publicacionId:      string;
  titulo:             string | null;
  tipo:               PublicacionTipo;
  fechaLimite:        string | null;
  entregado:          boolean;
  notaId:             string | null;
  nota:               number | null;
  comentarioDocente:  string | null;
  notaAt:             string | null;
}

export interface MisCalificacionesResponse {
  cursoId:       string;
  cursoCodigo:   string;
  cursoNombre:   string;
  anioPeriodo:   string;
  docenteNombre: string | null;
  calificaciones: CalificacionItem[];
  promedio:      number | null;
}

// ═══════════════════════════════════════════════════════════════
//  ENDPOINTS
// ═══════════════════════════════════════════════════════════════

const BASE = "/evaluaciones";

/** GET /api/evaluaciones/cursos — admin/docente */
export const getCursosEvaluacion = () =>
  api.get<CursoEvaluacionResponse[]>(`${BASE}/cursos`);

/** GET /api/evaluaciones/publicaciones/{id} — detalle con estudiantes y notas */
export const getPublicacionConNotas = (publicacionId: string) =>
  api.get<PublicacionConNotasResponse>(`${BASE}/publicaciones/${publicacionId}`);

/** POST /api/evaluaciones/notas — registrar o actualizar nota (upsert) */
export const registrarNota = (data: RegistrarNotaRequest) =>
  api.post<NotaResponse>(`${BASE}/notas`, data);

/** DELETE /api/evaluaciones/notas/{notaId} — eliminar nota */
export const eliminarNota = (notaId: string) =>
  api.delete<void>(`${BASE}/notas/${notaId}`);

/** GET /api/evaluaciones/mis-calificaciones — estudiante */
export const getMisCalificaciones = () =>
  api.get<MisCalificacionesResponse[]>(`${BASE}/mis-calificaciones`);