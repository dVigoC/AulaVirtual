package com.aula.backend.dtos;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.aula.backend.enums.AsistenciaEstado;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class EstudianteDto {
    
     // ── Respuesta: estudiante básico ─────────────────────────────────
    @Data
    public static class EstudianteResponse {
        private UUID   id;
        private String fullName;
        private String email;
        private String username;
        private boolean active;
    }
 
    // ── Respuesta: matrícula ─────────────────────────────────────────
    @Data
    public static class MatriculaResponse {
        private UUID                id;
        private EstudianteResponse  estudiante;
        private UUID                cursoId;
        private String              cursoNombre;
        private String              cursoCodigo;
        private String              anioPeriodo;
        private boolean             active;
        private OffsetDateTime      matriculadoAt;
        private String              matriculadoPorNombre;
    }
 
    // ── Request: matricular estudiante(s) ────────────────────────────
    @Data
    public static class MatricularRequest {
        @NotNull(message = "El ID del curso es obligatorio")
        private UUID cursoId;
 
        @NotEmpty(message = "Debes indicar al menos un estudiante")
        private List<UUID> estudianteIds;
 
        @NotBlank(message = "El año/periodo es obligatorio")
        @Size(max = 10, message = "Máximo 10 caracteres (ej: 2026-I)")
        private String anioPeriodo;
    }
 
    // ── Respuesta: curso con sus estudiantes matriculados ────────────
    @Data
    public static class CursoConEstudiantesResponse {
        private UUID                     cursoId;
        private String                   cursoNombre;
        private String                   cursoCodigo;
        private Short                    cursoCreditos;
        private boolean                  cursoActive;
        private String                   anioPeriodo;
        private String                   docenteNombre;   // null si no tiene docente asignado
        private String                   docenteEmail;
        private long                     totalEstudiantes;
        private List<EstudianteResponse> estudiantes;
    }
 
    // ── Request: crear clase ─────────────────────────────────────────
    @Data
    public static class CreateClaseRequest {
        @NotNull(message = "El ID del curso es obligatorio")
        private UUID cursoId;
 
        private UUID docenteId;   // opcional; si null, se toma el docente autenticado
 
        @Size(max = 200, message = "El título no puede superar 200 caracteres")
        private String titulo;
 
        @NotNull(message = "La fecha es obligatoria")
        private LocalDate fecha;
 
        @NotBlank(message = "El año/periodo es obligatorio")
        @Size(max = 10)
        private String anioPeriodo;
    }
 
    // ── Respuesta: clase ─────────────────────────────────────────────
    @Data
    public static class ClaseResponse {
        private UUID           id;
        private UUID           cursoId;
        private String         cursoNombre;
        private String         cursoCodigo;
        private String         docenteNombre;
        private String         titulo;
        private LocalDate      fecha;
        private OffsetDateTime horaInicio;
        private OffsetDateTime horaFin;
        private String         anioPeriodo;
        private Double         horasDictadas;   // calculado: (horaFin - horaInicio) en horas
        private String         estado;          // SIN_INICIAR | EN_CURSO | FINALIZADA
        private OffsetDateTime createdAt;
    }
 
    // ── Request: registrar / actualizar asistencia masiva ────────────
    @Data
    public static class RegistrarAsistenciaRequest {
        @NotNull
        private UUID claseId;
 
        @NotEmpty(message = "La lista de asistencias no puede estar vacía")
        private List<AsistenciaItem> asistencias;
    }
 
    @Data
    public static class AsistenciaItem {
        @NotNull
        private UUID              estudianteId;
 
        @NotNull
        private AsistenciaEstado  estado;
 
        private String            observacion;
    }
 
    // ── Respuesta: asistencia individual ────────────────────────────
    @Data
    public static class AsistenciaResponse {
        private UUID               id;
        private UUID               claseId;
        private EstudianteResponse estudiante;
        private AsistenciaEstado   estado;
        private String             observacion;
        private String             registradoPorNombre;
        private OffsetDateTime     createdAt;
        private OffsetDateTime     updatedAt;
    }
 
    // ── Respuesta: clase con lista de asistencias ────────────────────
    @Data
    public static class ClaseConAsistenciasResponse {
        private ClaseResponse             clase;
        private List<AsistenciaResponse>  asistencias;
        private long                      totalPresentes;
        private long                      totalAusentes;
        private long                      totalTardanzas;
        private long                      totalJustificados;
    }
 
    // ── Respuesta: resumen de asistencia de un estudiante en un curso
    @Data
    public static class ResumenAsistenciaResponse {
        private UUID   estudianteId;
        private String estudianteNombre;
        private UUID   cursoId;
        private String cursoNombre;
        private long   totalClases;
        private long   presentes;
        private long   tardanzas;
        private long   ausentes;
        private long   justificados;
        private Double porcentajeAsistencia;  // (presentes + tardanzas) / totalClases * 100
    }
}
