package com.aula.backend.dtos;

import java.time.OffsetDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Data;

public class PortadaDto {
    
    @Data
    public static class Request {
        private String imagenUrl;  // URL ya subida a Supabase Storage
    }
 
    @Data @Builder
    public static class Response {
        private UUID           id;
        private UUID           cursoId;
        private String         imagenUrl;
        private OffsetDateTime updatedAt;
    }
}
