package com.aula.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.aula.backend.model.EntregaEstudiante;

@Repository
public interface EntregaEstudianteRepository extends JpaRepository<EntregaEstudiante, UUID> {
 
    // Todas las entregas de una publicación (para el docente ver quién entregó)
    @Query("""
        SELECT e FROM EntregaEstudiante e
        JOIN FETCH e.estudiante
        WHERE e.publicacion.id = :publicacionId
        ORDER BY e.entregadoAt DESC
    """)
    List<EntregaEstudiante> findByPublicacionId(@Param("publicacionId") UUID publicacionId);
 
    // Si el estudiante ya entregó en esta publicación
    Optional<EntregaEstudiante> findByPublicacionIdAndEstudianteId(
        UUID publicacionId, UUID estudianteId
    );
 
    // IDs de publicaciones ya entregadas por el estudiante (para marcar "Entregado")
    @Query("""
        SELECT e.publicacion.id FROM EntregaEstudiante e
        WHERE e.estudiante.id = :estudianteId
          AND e.publicacion.id IN :publicacionIds
    """)
    List<UUID> findEntregadasIds(
        @Param("estudianteId")    UUID estudianteId,
        @Param("publicacionIds")  List<UUID> publicacionIds
    );

    //MODULO LIMPIEZA
    @Query("SELECT e.archivoUrl FROM EntregaEstudiante e JOIN e.publicacion p WHERE p.anioPeriodo = :periodo AND e.archivoUrl IS NOT NULL")
    List<String> findArchivoUrlsByPeriodo(@Param("periodo") String periodo);
    
    @Query("SELECT COUNT(e) FROM EntregaEstudiante e JOIN e.publicacion p WHERE p.anioPeriodo = :periodo")
    int countByPeriodo(@Param("periodo") String periodo);
    
    @Modifying
    @Query("DELETE FROM EntregaEstudiante e WHERE e.publicacion IN (SELECT p FROM Publicacion p WHERE p.anioPeriodo = :periodo)")
    void deleteByPeriodo(@Param("periodo") String periodo);

    // VISTA EVALUACION

      /**
     * Devuelve el conjunto de estudianteIds que entregaron en una publicación.
     * Usado para marcar el flag "entregado" en la vista de notas del docente.
     */
    @Query("""
        SELECT e.estudiante.id FROM EntregaEstudiante e
        WHERE e.publicacion.id = :publicacionId
          AND e.estudiante.id  IN :estudianteIds
    """)
    Set<UUID> findEntregadasIdsByEstudiantesAndPublicacion(
        @Param("estudianteIds")   List<UUID> estudianteIds,
        @Param("publicacionId")   UUID publicacionId
    );
 
    /**
     * Cuenta de entregas por lista de publicaciones (para resumen del curso).
     * Retorna Object[]{UUID publicacionId, Long count}
     */
    @Query("""
        SELECT e.publicacion.id, COUNT(e)
        FROM EntregaEstudiante e
        WHERE e.publicacion.id IN :publicacionIds
        GROUP BY e.publicacion.id
    """)
    List<Object[]> countByPublicacionIds(@Param("publicacionIds") List<UUID> publicacionIds);
}