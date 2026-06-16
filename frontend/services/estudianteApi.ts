// ── services/estudianteApi.ts ─────────────────────────────────────────────────
import api from "./authApi";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type AsistenciaEstado = "PRESENTE" | "TARDANZA" | "AUSENTE" | "JUSTIFICADO";
export type ClaseEstado      = "SIN_INICIAR" | "EN_CURSO" | "FINALIZADA";

export interface EstudianteResponse {
  id:       string;
  fullName: string | null;
  email:    string;
  username: string;
  active:   boolean;
}

export interface MatriculaResponse {
  id:                   string;
  estudiante:           EstudianteResponse;
  cursoId:              string;
  cursoNombre:          string;
  cursoCodigo:          string;
  anioPeriodo:          string;
  active:               boolean;
  matriculadoAt:        string | null;
  matriculadoPorNombre: string | null;
}

export interface CursoConEstudiantesResponse {
  cursoId:          string;
  cursoNombre:      string;
  cursoCodigo:      string;
  cursoCreditos:    number;
  cursoActive:      boolean;
  anioPeriodo:      string;
  docenteNombre:    string | null;
  docenteEmail:     string | null;
  totalEstudiantes: number;
  estudiantes:      EstudianteResponse[];
}

export interface ClaseResponse {
  id:            string;
  cursoId:       string;
  cursoNombre:   string;
  cursoCodigo:   string;
  docenteNombre: string | null;
  titulo:        string | null;
  fecha:         string;           // "YYYY-MM-DD"
  horaInicio:    string | null;    // ISO timestamp
  horaFin:       string | null;    // ISO timestamp
  anioPeriodo:   string;
  horasDictadas: number;
  estado:        ClaseEstado;
  createdAt:     string | null;
}

export interface AsistenciaResponse {
  id:                  string;
  claseId:             string;
  estudiante:          EstudianteResponse;
  estado:              AsistenciaEstado;
  observacion:         string | null;
  registradoPorNombre: string | null;
  createdAt:           string | null;
  updatedAt:           string | null;
}

export interface ClaseConAsistenciasResponse {
  clase:             ClaseResponse;
  asistencias:       AsistenciaResponse[];
  totalPresentes:    number;
  totalAusentes:     number;
  totalTardanzas:    number;
  totalJustificados: number;
}

export interface ResumenAsistenciaResponse {
  estudianteId:          string;
  estudianteNombre:      string | null;
  cursoId:               string;
  cursoNombre:           string;
  totalClases:           number;
  presentes:             number;
  tardanzas:             number;
  ausentes:              number;
  justificados:          number;
  porcentajeAsistencia:  number;
}

// ── Request shapes ────────────────────────────────────────────────────────────

export interface MatricularRequest {
  cursoId:       string;
  estudianteIds: string[];
  anioPeriodo:   string;
}

export interface CreateClaseRequest {
  cursoId:     string;
  docenteId?:  string;
  titulo?:     string;
  fecha:       string;           // "YYYY-MM-DD"
  anioPeriodo: string;
}

export interface AsistenciaItem {
  estudianteId: string;
  estado:       AsistenciaEstado;
  observacion?: string;
}

export interface RegistrarAsistenciaRequest {
  claseId:     string;
  asistencias: AsistenciaItem[];
}

// ── BASE ──────────────────────────────────────────────────────────────────────
const BASE = "/estudiantes";

// ── Cursos con estudiantes ────────────────────────────────────────────────────
export const getCursosConEstudiantes = () =>
  api.get<CursoConEstudiantesResponse[]>(`${BASE}/cursos-con-estudiantes`);

// ── Matrículas ────────────────────────────────────────────────────────────────
export const matricularEstudiantes = (data: MatricularRequest) =>
  api.post<MatriculaResponse[]>(`${BASE}/matriculas`, data);

export const removerMatricula = (matriculaId: string) =>
  api.delete<void>(`${BASE}/matriculas/${matriculaId}`);

export const getMatriculasByCurso = (cursoId: string) =>
  api.get<MatriculaResponse[]>(`${BASE}/matriculas/curso/${cursoId}`);

// ── Clases ────────────────────────────────────────────────────────────────────
export const crearClase = (data: CreateClaseRequest) =>
  api.post<ClaseResponse>(`${BASE}/clases`, data);

export const getClasesByCurso = (cursoId: string) =>
  api.get<ClaseResponse[]>(`${BASE}/clases/curso/${cursoId}`);

export const marcarInicio = (claseId: string) =>
  api.patch<ClaseResponse>(`${BASE}/clases/${claseId}/inicio`, null);

export const marcarFin = (claseId: string) =>
  api.patch<ClaseResponse>(`${BASE}/clases/${claseId}/fin`, null);

// ── Asistencias ───────────────────────────────────────────────────────────────
export const registrarAsistencias = (data: RegistrarAsistenciaRequest) =>
  api.post<ClaseConAsistenciasResponse>(`${BASE}/asistencias`, data);

export const getAsistenciasByClase = (claseId: string) =>
  api.get<ClaseConAsistenciasResponse>(`${BASE}/asistencias/clase/${claseId}`);

export const getResumenAsistencia = (estudianteId: string, cursoId: string) =>
  api.get<ResumenAsistenciaResponse>(`${BASE}/asistencias/resumen`, {
    params: { estudianteId, cursoId },
  });