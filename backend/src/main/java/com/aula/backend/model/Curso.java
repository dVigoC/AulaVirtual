package com.aula.backend.model;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Data
@Table(name="cursos", schema="auth_app")
public class Curso {
    
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique=true, length = 20)
    private String codigo;

    @Column(nullable = false, unique=true, length = 20)
    private String nombre;

    @Column(columnDefinition = "TEXT")
    private String descripcion;
    @Column(nullable = false)
    private Short creditos=0;
    @Column(name = "is_active", nullable = false)
    private Boolean active = true;
 
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
 
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
 
    @PrePersist
    protected void onCreate() {
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }
 
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}
