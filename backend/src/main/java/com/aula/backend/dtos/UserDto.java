package com.aula.backend.dtos;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.aula.backend.enums.UserRole;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class UserDto {
     // ── Response (lo que el servidor devuelve al frontend) ──────────
    @Data
    public static class Response {
        private UUID id;
        private String username;
        private String email;

        @com.fasterxml.jackson.annotation.JsonProperty("fullName")
        private String fullName;
        private UserRole role;

        @com.fasterxml.jackson.annotation.JsonProperty("isActive")
        private boolean active;
        private boolean emailVerified;
        private boolean accountLocked;
        private OffsetDateTime createdAt;
        private OffsetDateTime lastLoginAt;
    }

    // ── CreateRequest (nuevo usuario desde el panel admin) ──────────
    @Data
    public static class CreateRequest {

        @NotBlank(message = "El username es obligatorio")
        @Size(min = 3, max = 50)
        @Pattern(regexp = "^[a-z0-9_.]+$",
                 message = "Solo letras minúsculas, números, puntos y guiones bajos")
        private String username;

        @NotBlank(message = "El email es obligatorio")
        @Email(message = "Formato de email inválido")
        @Size(max = 255)
        private String email;

        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, message = "Mínimo 8 caracteres")
        private String password;

        @Size(max = 150)
        private String fullName;

        @NotNull(message = "El rol es obligatorio")
        private UserRole role;
    }

    // ── UpdateRequest (edición de datos básicos) ────────────────────
    @Data
    public static class UpdateRequest {

        @Size(min = 3, max = 50)
        @Pattern(regexp = "^[a-z0-9_.]+$",
                 message = "Solo letras minúsculas, números, puntos y guiones bajos")
        private String username;

        @Email(message = "Formato de email inválido")
        @Size(max = 255)
        private String email;

        @Size(max = 150)
        private String fullName;

        private UserRole role;
    }

    // ── StatusRequest (activar / desactivar / desbloquear) ──────────
    @Data
    public static class StatusRequest {
        @NotNull
        
        private Boolean isActive;
    }

    // ── PasswordRequest (reset de contraseña por admin) ─────────────
    @Data
    public static class PasswordRequest {
        @NotBlank
        @Size(min = 8, message = "Mínimo 8 caracteres")
        private String newPassword;
    }

    // ── PageResponse (lista paginada) ───────────────────────────────
    @Data
    public static class PageResponse {
        private java.util.List<Response> content;
        private int page;
        private int size;
        private long totalElements;
        private int totalPages;
    }
}
