package com.aula.backend.model;

import java.math.BigDecimal;
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

@Entity
@Table(
    name = "notas",
    schema = "auth_app",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_nota_pub_estudiante",
        columnNames = {"publicacion_id", "estudiante_id"}
    )
)
@NoArgsConstructor @AllArgsConstructor @Data @Builder
public class Nota {
    
     @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publicacion_id", nullable = false)
    private Publicacion publicacion;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estudiante_id", nullable = false)
    private User estudiante;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registrado_por")
    private User registradoPor;
 
    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal nota;
 
    @Column(columnDefinition = "TEXT")
    private String comentario;
 
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
 
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
