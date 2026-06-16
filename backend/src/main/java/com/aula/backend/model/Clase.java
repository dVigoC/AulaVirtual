package com.aula.backend.model;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.*;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name="clases", schema = "auth_app")
public class Clase {
    @Id
    @GeneratedValue
    private UUID id;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "curso_id", nullable = false)
    private Curso curso;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "docente_id")
    private User docente;
 
    @Column(length = 200)
    private String titulo;
 
    @Column(nullable = false)
    private LocalDate fecha;
 
    @Column(name = "hora_inicio")
    private OffsetDateTime horaInicio;
 
    @Column(name = "hora_fin")
    private OffsetDateTime horaFin;
 
    @Column(name = "anio_periodo", nullable = false, length = 10)
    private String anioPeriodo;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creado_por")
    private User creadoPor;
 
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
