// ── services/limpiezaApi.ts ───────────────────────────────────────────────────
import api from "./authApi";

export interface LimpiezaPreview {
  periodo: string;
  totalPublicaciones: number;
  totalEntregas: number;
  totalPortadas: number;
  totalClases: number;
  totalAsistencias: number;
  totalMatriculas: number;
  totalArchivosStorage: number;
  periodosDisponibles: string[];
}

export interface LimpiezaResultado {
  periodo: string;
  publicacionesEliminadas: number;
  entregasEliminadas: number;
  portadasEliminadas: number;
  clasesEliminadas: number;
  asistenciasEliminadas: number;
  matriculasEliminadas: number;
  archivosStorageEliminados: number;
  archivosStorageFallidos: number;
  mensaje: string;
}

const BASE = "/admin/limpieza";

export const getPeriodosDisponibles = () =>
  api.get<string[]>(`${BASE}/periodos`);

export const getLimpiezaPreview = (periodo: string) =>
  api.get<LimpiezaPreview>(`${BASE}/preview/${periodo}`);

export const eliminarPeriodo = (periodo: string) =>
  api.delete<LimpiezaResultado>(`${BASE}/periodo/${periodo}`);
