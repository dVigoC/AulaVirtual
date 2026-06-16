package com.aula.backend.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.aula.backend.model.Clase;

@Repository
public interface ClaseRepository extends JpaRepository<Clase, UUID> {
 
    // Clases de un curso ordenadas por fecha desc
    @Query("""
        SELECT c FROM Clase c
        LEFT JOIN FETCH c.docente
        WHERE c.curso.id = :cursoId
        ORDER BY c.fecha DESC, c.createdAt DESC
        """)
    List<Clase> findByCursoId(@Param("cursoId") UUID cursoId);
 
    // Clases de un curso en un periodo
    @Query("""
        SELECT c FROM Clase c
        LEFT JOIN FETCH c.docente
        WHERE c.curso.id    = :cursoId
          AND c.anioPeriodo = :periodo
        ORDER BY c.fecha DESC, c.createdAt DESC
        """)
    List<Clase> findByCursoIdAndPeriodo(
        @Param("cursoId") UUID cursoId,
        @Param("periodo") String periodo
    );
 
    // Clases de los cursos de un docente
    @Query("""
        SELECT c FROM Clase c
        LEFT JOIN FETCH c.curso
        WHERE c.docente.id = :docenteId
        ORDER BY c.fecha DESC
        """)
    List<Clase> findByDocenteId(@Param("docenteId") UUID docenteId);

    //MODULO LIMPIEZA

    int countByAnioPeriodo(String anioPeriodo);
 
    @Modifying
    @Query("DELETE FROM Clase c WHERE c.anioPeriodo = :periodo")
    void deleteByAnioPeriodo(@Param("periodo") String periodo);
}
