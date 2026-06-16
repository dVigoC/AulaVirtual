package com.aula.backend.dtos;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class CursoDto {
     // ── Response: datos de un curso ─────────────────────────────────
    @Data
    public static class Response {
        private UUID    id;
        private String  codigo;
        private String  nombre;
        private String  descripcion;
        private Short   creditos;
        private boolean active;
        private OffsetDateTime createdAt;
        private OffsetDateTime updatedAt;
    }
 
    // ── CreateRequest ───────────────────────────────────────────────
    @Data
    public static class CreateRequest {
 
        @NotBlank(message = "El código es obligatorio")
        @Size(min = 2, max = 20, message = "El código debe tener entre 2 y 20 caracteres")
        private String codigo;
 
        @NotBlank(message = "El nombre es obligatorio")
        @Size(min = 2, max = 150, message = "El nombre debe tener entre 2 y 150 caracteres")
        private String nombre;
 
        private String descripcion;
 
        @Min(value = 0,  message = "Los créditos no pueden ser negativos")
        @Max(value = 20, message = "Los créditos no pueden superar 20")
        private Short creditos = 0;
    }
 
    // ── UpdateRequest ───────────────────────────────────────────────
    @Data
    public static class UpdateRequest {
 
        @Size(min = 2, max = 20, message = "El código debe tener entre 2 y 20 caracteres")
        private String codigo;
 
        @Size(min = 2, max = 150, message = "El nombre debe tener entre 2 y 150 caracteres")
        private String nombre;
 
        private String descripcion;
 
        @Min(value = 0,  message = "Los créditos no pueden ser negativos")
        @Max(value = 20, message = "Los créditos no pueden superar 20")
        private Short creditos;
    }
 
    // ── PageResponse ────────────────────────────────────────────────
    @Data
    public static class PageResponse {
        private List<Response> content;
        private int  page;
        private int  size;
        private long totalElements;
        private int  totalPages;
    }
 
    // ── AsignacionRequest: asignar uno o varios cursos a un docente ─
    @Data
    public static class AsignacionRequest {
        @NotNull(message = "El ID del docente es obligatorio")
        private UUID docenteId;

        @NotEmpty(message = "Debes indicar al menos un curso")
        private List<UUID> cursoIds;

        @NotBlank(message = "El año/periodo es obligatorio")
        @Size(max = 10, message = "Máximo 10 caracteres (ej: 2026-I)")
        private String anioPeriodo;
    }
 
    // ── AsignacionResponse: detalle de una asignación ───────────────
    @Data
    public static class AsignacionResponse {
        private UUID   id;
        private UUID   docenteId;
        private String docenteNombre;
        private String docenteEmail;
        private UUID   cursoId;
        private String cursoNombre;
        private String cursoCodigo;
        private Short  cursoCreditos;
        private boolean active;
        private OffsetDateTime asignadoAt;
        private String asignadoPorNombre;
    }
 
    // ── DocenteConCursosResponse: docente + lista de sus cursos ─────
    @Data
    public static class DocenteConCursosResponse {
        private UUID         docenteId;
        private String       docenteNombre;
        private String       docenteEmail;
        private String       docenteUsername;
        private List<Response> cursos;
    }
}
