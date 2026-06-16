package com.aula.backend.model;

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
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name="matriculas", schema = "auth_app")
public class Matricula {
    @Id
    @GeneratedValue
    private UUID id;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estudiante_id", nullable = false)
    private User estudiante;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "curso_id", nullable = false)
    private Curso curso;
 
    @Column(name = "anio_periodo", nullable = false, length = 10)
    private String anioPeriodo;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matriculado_por")
    private User matriculadoPor;
 
    @Column(name = "matriculado_at", nullable = false, updatable = false)
    private OffsetDateTime matriculadoAt;
 
    @Column(name = "is_active", nullable = false)
    private Boolean active = true;
 
    @PrePersist
    protected void onCreate() {
        this.matriculadoAt = OffsetDateTime.now();
    }
}
