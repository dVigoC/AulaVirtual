package com.aula.backend.dtos;

import java.time.OffsetDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Data;

public class EntregaDto {
    
    @Data
    public static class CreateRequest {
        private UUID   publicacionId;
        private String archivoUrl;
        private String archivoNombre;
        private String archivoTipo;
        private String linkEntrega;
        private String comentario;
    }
 
    @Data @Builder
    public static class Response {
        private UUID           id;
        private UUID           publicacionId;
        private UUID           estudianteId;
        private String         estudianteNombre;
        private String         estudianteEmail;
        private String         archivoUrl;
        private String         archivoNombre;
        private String         archivoTipo;
        private String         linkEntrega;
        private String         comentario;
        private OffsetDateTime entregadoAt;
        private OffsetDateTime updatedAt;
    }

}
