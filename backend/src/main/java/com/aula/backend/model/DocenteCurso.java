package com.aula.backend.model;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "docente_cursos", schema = "auth_app")
public class DocenteCurso {

    @Id
    @GeneratedValue
    private UUID id;
 
    // Relación con el docente (usuario con rol DOCENTE)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "docente_id", nullable = false)
    private User docente;
 
    // Relación con el curso
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "curso_id", nullable = false)
    private Curso curso;

    // Año y periodo académico (Ej: '2026-I', '2026-II')
    @Column(name = "anio_periodo", nullable = false, length = 10)
    private String anioPeriodo;
 
    // Admin que realizó la asignación
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asignado_por")
    private User asignadoPor;
 
    @Column(name = "asignado_at", nullable = false)
    private OffsetDateTime asignadoAt;
 
    @Column(name = "is_active", nullable = false)
    private Boolean active = true;
 
    @PrePersist
    protected void onCreate() {
        this.asignadoAt = OffsetDateTime.now();
    }
    
}
