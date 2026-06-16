package com.aula.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.aula.backend.model.Nota;

@Repository
public interface NotaRepository extends JpaRepository<Nota, UUID> {
 
    // Buscar nota de un estudiante en una publicación (para upsert)
    Optional<Nota> findByPublicacionIdAndEstudianteId(
        UUID publicacionId, UUID estudianteId
    );
 
    // Todas las notas de una publicación (docente ve quién tiene nota)
    @Query("""
        SELECT n FROM Nota n
        JOIN FETCH n.estudiante
        LEFT JOIN FETCH n.registradoPor
        WHERE n.publicacion.id = :publicacionId
        ORDER BY n.estudiante.fullName ASC
    """)
    List<Nota> findByPublicacionId(@Param("publicacionId") UUID publicacionId);
 
    // IDs de publicaciones que ya tienen nota para un estudiante
    // (para saber si ya está calificado al construir la vista del estudiante)
    @Query("""
        SELECT n.publicacion.id FROM Nota n
        WHERE n.estudiante.id = :estudianteId
          AND n.publicacion.id IN :publicacionIds
    """)
    List<UUID> findPublicacionIdsConNota(
        @Param("estudianteId")    UUID estudianteId,
        @Param("publicacionIds")  List<UUID> publicacionIds
    );
 
    // Todas las notas de un estudiante en un curso/periodo (para "Mis Calificaciones")
    @Query("""
        SELECT n FROM Nota n
        JOIN FETCH n.publicacion p
        LEFT JOIN FETCH n.registradoPor
        WHERE n.estudiante.id    = :estudianteId
          AND p.curso.id         = :cursoId
          AND p.anioPeriodo      = :periodo
        ORDER BY p.createdAt ASC
    """)
    List<Nota> findByEstudianteAndCursoAndPeriodo(
        @Param("estudianteId") UUID estudianteId,
        @Param("cursoId")      UUID cursoId,
        @Param("periodo")      String periodo
    );
 
    // Contar cuántos estudiantes tienen nota en una publicación
    @Query("""
        SELECT COUNT(n) FROM Nota n
        WHERE n.publicacion.id = :publicacionId
    """)
    int countByPublicacionId(@Param("publicacionId") UUID publicacionId);
 
    // Contar notas por lista de publicaciones (para resumen del curso)
    @Query("""
        SELECT n.publicacion.id, COUNT(n)
        FROM Nota n
        WHERE n.publicacion.id IN :publicacionIds
        GROUP BY n.publicacion.id
    """)
    List<Object[]> countByPublicacionIds(@Param("publicacionIds") List<UUID> publicacionIds);
 
    // Limpieza por período
    @Query("""
        DELETE FROM Nota n
        WHERE n.publicacion.id IN (
            SELECT p.id FROM Publicacion p WHERE p.anioPeriodo = :periodo
        )
    """)
    void deleteByPeriodo(@Param("periodo") String periodo);
}