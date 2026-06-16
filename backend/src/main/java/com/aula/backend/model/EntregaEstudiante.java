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
    name = "entregas_estudiantes",
    schema = "auth_app",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_entrega_pub_estudiante",
        columnNames = {"publicacion_id", "estudiante_id"}
    )
)
@NoArgsConstructor @AllArgsConstructor @Data
public class EntregaEstudiante {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publicacion_id", nullable = false)
    private Publicacion publicacion;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estudiante_id", nullable = false)
    private User estudiante;
 
    // Archivo o link de entrega
    @Column(name = "archivo_url",    length = 1000)
    private String archivoUrl;
 
    @Column(name = "archivo_nombre", length = 255)
    private String archivoNombre;
 
    @Column(name = "archivo_tipo",   length = 100)
    private String archivoTipo;
 
    @Column(name = "link_entrega",   length = 500)
    private String linkEntrega;
 
    @Column(columnDefinition = "TEXT")
    private String comentario;
 
    @CreationTimestamp
    @Column(name = "entregado_at", nullable = false, updatable = false)
    private OffsetDateTime entregadoAt;
 
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
