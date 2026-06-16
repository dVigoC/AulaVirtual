package com.aula.backend.model;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.aula.backend.enums.AsistenciaEstado;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name="asistencias", schema = "auth_app")
public class Asistencia {
    @Id
    @GeneratedValue
    private UUID id;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "clase_id", nullable = false)
    private Clase clase;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estudiante_id", nullable = false)
    private User estudiante;
 
    @Enumerated(EnumType.STRING)
    @Column(
        nullable = false,
        columnDefinition = "auth_app.asistencia_estado"
    )
    @org.hibernate.annotations.JdbcTypeCode(
        org.hibernate.type.SqlTypes.NAMED_ENUM
    )
    private AsistenciaEstado estado = AsistenciaEstado.AUSENTE;
 
    @Column(columnDefinition = "TEXT")
    private String observacion;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registrado_por")
    private User registradoPor;
 
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
