package com.aula.backend.dtos;

import java.util.UUID;

import lombok.Builder;
import lombok.Data;

public class CursoInicioDto {
    
     @Data @Builder
    public static class Response {
        private UUID   cursoId;
        private String cursoCodigo;
        private String cursoNombre;
        private String descripcion;
        private int    creditos;
        private String anioPeriodo;
        private String portadaUrl;          // null si no tiene portada
        private String docenteNombre;       // null para estudiante
        private int    totalEstudiantes;    // 0 para estudiante
        private boolean esDocente;          // true si el user es docente asignado
    }
}
