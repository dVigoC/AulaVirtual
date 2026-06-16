package com.aula.backend.dtos;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.aula.backend.enums.PublicacionTipo;

import lombok.Builder;
import lombok.Data;

// ─── Request: crear publicación ──────────────────────────────────────────────
public class PublicacionDto {
 
    @Data
    public static class CreateRequest {
        private UUID          cursoId;
        private PublicacionTipo tipo;
        private String        titulo;
        private String        descripcion;
        private String        anioPeriodo;
 
        // Clase virtual
        private String        linkReunion;
        private OffsetDateTime fechaClase;
 
        // Archivo (viene como URL ya subida a Storage desde el frontend)
        private String        archivoUrl;
        private String        archivoNombre;
        private String        archivoTipo;
 
        // Tarea / Evaluación
        private OffsetDateTime fechaLimite;
        private Boolean       permitirEnvioTardio;
 
        // Anuncio / Contenido Inmediato
        private OffsetDateTime fechaInicio;
        private OffsetDateTime fechaFin;
    }
 
    // ─── Response ────────────────────────────────────────────────────────────
    @Data @Builder
    public static class Response {
        private UUID            id;
        private UUID            cursoId;
        private String          cursoNombre;
        private UUID            docenteId;
        private String          docenteNombre;
        private PublicacionTipo tipo;
        private String          titulo;
        private String          descripcion;
        private String          anioPeriodo;
 
        // Clase virtual
        private String          linkReunion;
        private OffsetDateTime  fechaClase;
 
        // Archivo
        private String          archivoUrl;
        private String          archivoNombre;
        private String          archivoTipo;
 
        // Tarea / Evaluación
        private OffsetDateTime  fechaLimite;
        private boolean         permitirEnvioTardio;
 
        // Anuncio / Contenido Inmediato
        private OffsetDateTime  fechaInicio;
        private OffsetDateTime  fechaFin;
 
        private OffsetDateTime  createdAt;
        private OffsetDateTime  updatedAt;
 
        // Calculados: solo se rellenan según el caller
        private Long            totalEntregas;   // docente/admin: cuántos entregaron
        private Boolean         entregado;       // estudiante: si ya entregó
        private Boolean         vencida;         // si fechaLimite ya pasó
    }
 
    // ─── Request: actualizar permitir envío tardío ────────────────────────────
    @Data
    public static class UpdatePermisoRequest {
        private boolean permitirEnvioTardio;
    }
}