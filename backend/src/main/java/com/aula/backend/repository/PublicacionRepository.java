package com.aula.backend.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;


import com.aula.backend.enums.PublicacionTipo;
import com.aula.backend.model.Publicacion;

@Repository
public interface PublicacionRepository extends JpaRepository<Publicacion, UUID> {
 
    // Todas las publicaciones de un curso, ordenadas por fecha de creación ASC
    // (primero publicada = primera en la lista)
    @Query("""
        SELECT p FROM Publicacion p
        WHERE p.curso.id = :cursoId
          AND p.anioPeriodo = :periodo
        ORDER BY p.createdAt ASC
    """)
    List<Publicacion> findByCursoAndPeriodo(
        @Param("cursoId") UUID cursoId,
        @Param("periodo") String periodo
    );
 
    // Publicaciones de cursos en los que el docente está asignado
    @Query("""
        SELECT p FROM Publicacion p
        WHERE p.docente.id = :docenteId
          AND p.curso.id   = :cursoId
          AND p.anioPeriodo = :periodo
        ORDER BY p.createdAt ASC
    """)
    List<Publicacion> findByDocenteAndCursoAndPeriodo(
        @Param("docenteId") UUID docenteId,
        @Param("cursoId")   UUID cursoId,
        @Param("periodo")   String periodo
    );

    //MODULO DE LIMPIEZA

    @Query("SELECT p.archivoUrl FROM Publicacion p WHERE p.anioPeriodo = :periodo AND p.archivoUrl IS NOT NULL")
    List<String> findArchivoUrlsByPeriodo(@Param("periodo") String periodo);
    
    @Query("SELECT COUNT(p) FROM Publicacion p WHERE p.anioPeriodo = :periodo")
    int countByPeriodo(@Param("periodo") String periodo);
    
    @Query("SELECT DISTINCT p.anioPeriodo FROM Publicacion p ORDER BY p.anioPeriodo DESC")
    List<String> findDistinctPeriodos();
    
    @Modifying
    @Query("DELETE FROM Publicacion p WHERE p.anioPeriodo = :periodo")
    void deleteByAnioPeriodo(@Param("periodo") String periodo);

    // VISTA EVALUACIONES

     /** Publicaciones evaluables (TAREA / EVALUACION) de un curso y periodo */
    @Query("""
        SELECT p FROM Publicacion p
        WHERE p.curso.id    = :cursoId
          AND p.anioPeriodo = :periodo
          AND p.tipo        IN :tipos
        ORDER BY p.createdAt ASC
    """)
    List<Publicacion> findByCursoIdAndAnioPeriodoAndTipoInOrderByCreatedAtAsc(
        @Param("cursoId") UUID cursoId,
        @Param("periodo") String periodo,
        @Param("tipos")   List<PublicacionTipo> tipos
    );
 
    /**
     * Cursos del periodo para el usuario.
     * ADMIN → todos. DOCENTE → solo los suyos.
     * Reutiliza la misma lógica que getCursosInicio del PublicacionService.
     */
      @Query("""
        SELECT
            c.id,
            c.codigo,
            c.nombre,
            c.descripcion,
            c.creditos,
            dc.anioPeriodo,
            cp.imagenUrl,
            u.fullName
        FROM DocenteCurso dc
        JOIN dc.curso c
        JOIN dc.docente u
        LEFT JOIN CursoPortada cp ON cp.curso = c AND cp.docente = u
        WHERE dc.anioPeriodo = :periodo
          AND dc.active      = TRUE
          AND (:role = 'ADMIN' OR dc.docente.id = :userId)
        ORDER BY c.nombre ASC
    """)
    List<Object[]> findCursosInicioRaw(
        @Param("userId")  UUID userId,
        @Param("role")    String role,
        @Param("periodo") String periodo
    );
}
