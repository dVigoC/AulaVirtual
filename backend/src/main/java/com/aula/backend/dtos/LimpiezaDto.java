package com.aula.backend.dtos;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class LimpiezaDto {
    
    
    // ── Respuesta de vista previa (antes de eliminar) ─────────────────────────
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Preview {
        private String periodo;
        private int totalPublicaciones;
        private int totalEntregas;
        private int totalPortadas;
        private int totalClases;
        private int totalAsistencias;
        private int totalMatriculas;
        private int totalArchivosStorage;   // publicaciones + entregas + portadas
        private List<String> periodosDisponibles; // todos los períodos en BD
    }
 
    // ── Respuesta tras eliminar ───────────────────────────────────────────────
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Resultado {
        private String periodo;
        private int publicacionesEliminadas;
        private int entregasEliminadas;
        private int portadasEliminadas;
        private int clasesEliminadas;
        private int asistenciasEliminadas;
        private int matriculasEliminadas;
        private int archivosStorageEliminados;
        private int archivosStorageFallidos;  // los que no se pudieron borrar en Storage
        private String mensaje;
    }
}
