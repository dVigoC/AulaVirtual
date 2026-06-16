package com.aula.backend.model;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import com.aula.backend.enums.PublicacionTipo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Entity
@Table(name = "publicaciones", schema = "auth_app")
@NoArgsConstructor @AllArgsConstructor @Data @Builder
public class Publicacion {
    
     @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "curso_id", nullable = false)
    private Curso curso;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "docente_id", nullable = false)
    private User docente;
 
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false,
            columnDefinition = "auth_app.publicacion_tipo")
    private PublicacionTipo tipo;
 
    // Campos comunes
    private String titulo;
 
    @Column(columnDefinition = "TEXT")
    private String descripcion;
 
    // Clase Virtual
    @Column(name = "link_reunion", length = 500)
    private String linkReunion;
 
    @Column(name = "fecha_clase")
    private OffsetDateTime fechaClase;
 
    // Archivo adjunto (tarea / material / evaluación)
    @Column(name = "archivo_url",    length = 1000)
    private String archivoUrl;
 
    @Column(name = "archivo_nombre", length = 255)
    private String archivoNombre;
 
    @Column(name = "archivo_tipo",   length = 100)
    private String archivoTipo;
 
    // Fecha límite (tarea / evaluación)
    @Column(name = "fecha_limite")
    private OffsetDateTime fechaLimite;
 
    @Builder.Default
    @Column(name = "permitir_envio_tardio", nullable = false)
    private boolean permitirEnvioTardio = false;
 
    // Anuncio / Contenido Inmediato
    @Column(name = "fecha_inicio")
    private OffsetDateTime fechaInicio;
 
    @Column(name = "fecha_fin")
    private OffsetDateTime fechaFin;
 
    @Column(name = "anio_periodo", nullable = false, length = 10)
    private String anioPeriodo;
 
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
 
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
