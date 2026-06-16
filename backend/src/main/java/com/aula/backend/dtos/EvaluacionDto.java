package com.aula.backend.dtos;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.aula.backend.enums.PublicacionTipo;

import lombok.Builder;
import lombok.Data;

public class EvaluacionDto {
    
    
    // ── Request: registrar o actualizar nota de un estudiante ─────────────────
    @Data
    public static class RegistrarNotaRequest {
        private UUID       publicacionId;
        private UUID       estudianteId;
        private BigDecimal nota;           // 0.00 – 20.00
        private String     comentario;
    }
 
    // ── Response: nota individual de un estudiante ────────────────────────────
    @Data @Builder
    public static class NotaResponse {
        private UUID           id;
        private UUID           publicacionId;
        private String         publicacionTitulo;
        private PublicacionTipo publicacionTipo;
        private UUID           estudianteId;
        private String         estudianteNombre;
        private String         estudianteEmail;
        private UUID           registradoPorId;
        private String         registradoPorNombre;
        private BigDecimal     nota;
        private String         comentario;
        private OffsetDateTime createdAt;
        private OffsetDateTime updatedAt;
    }
 
    // ── Response: publicación con su lista de notas (vista docente/admin) ─────
    @Data @Builder
    public static class PublicacionConNotasResponse {
        private UUID            publicacionId;
        private String          titulo;
        private PublicacionTipo tipo;
        private String          anioPeriodo;
        private OffsetDateTime  fechaLimite;
        private int             totalMatriculados;
        private int             totalCalificados;
        // Cada estudiante matriculado con su nota (null si aún no tiene)
        private List<EstudianteNotaItem> estudiantes;
    }
 
    @Data @Builder
    public static class EstudianteNotaItem {
        private UUID       estudianteId;
        private String     estudianteNombre;
        private String     estudianteEmail;
        private UUID       notaId;          // null si no tiene nota aún
        private BigDecimal nota;            // null si no tiene nota aún
        private String     comentario;
        private boolean    entregado;       // si hizo entrega de archivo
        private OffsetDateTime notaAt;      // cuándo se registró la nota
    }
 
    // ── Response: curso con sus publicaciones evaluables (vista docente/admin) ─
    @Data @Builder
    public static class CursoEvaluacionResponse {
        private UUID   cursoId;
        private String cursoCodigo;
        private String cursoNombre;
        private String anioPeriodo;
        private int    totalPublicaciones;  // solo TAREA + EVALUACION
        private List<PublicacionResumenItem> publicaciones;
    }
 
    @Data @Builder
    public static class PublicacionResumenItem {
        private UUID            publicacionId;
        private String          titulo;
        private PublicacionTipo tipo;
        private OffsetDateTime  fechaLimite;
        private int             totalMatriculados;
        private int             totalCalificados;
        private int             totalEntregas;
    }
 
    // ── Response: calificaciones de un estudiante (vista estudiante) ──────────
    @Data @Builder
    public static class MisCalificacionesResponse {
        private UUID   cursoId;
        private String cursoCodigo;
        private String cursoNombre;
        private String anioPeriodo;
        private String docenteNombre;
        private List<CalificacionItem> calificaciones;
        // Promedio calculado solo de las notas registradas
        private BigDecimal promedio;
    }
 
    @Data @Builder
    public static class CalificacionItem {
        private UUID            publicacionId;
        private String          titulo;
        private PublicacionTipo tipo;
        private OffsetDateTime  fechaLimite;
        private boolean         entregado;
        private UUID            notaId;
        private BigDecimal      nota;
        private String          comentarioDocente;
        private OffsetDateTime  notaAt;
    }
}
