package com.aula.backend.model;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Builder
@Entity
@Table(
    name = "cursos_portadas",
    schema = "auth_app",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_portada_curso_docente",
        columnNames = {"curso_id", "docente_id"}
    )
)
@NoArgsConstructor @AllArgsConstructor @Data
public class CursoPortada {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "curso_id", nullable = false)
    private Curso curso;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "docente_id")
    private User docente;
 
    @Column(name = "imagen_url", nullable = false, length = 1000)
    private String imagenUrl;
 
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
 
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
