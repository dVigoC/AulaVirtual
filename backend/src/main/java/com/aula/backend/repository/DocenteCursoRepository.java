package com.aula.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.aula.backend.model.DocenteCurso;

@Repository
public interface DocenteCursoRepository extends JpaRepository<DocenteCurso, UUID> {
 
    // Todas las asignaciones activas de un docente (con curso cargado)
    @Query("SELECT dc FROM DocenteCurso dc JOIN FETCH dc.curso WHERE dc.docente.id = :docenteId AND dc.active = true")
    List<DocenteCurso> findActivasByDocente(@Param("docenteId") UUID docenteId);
 
    // Todas las asignaciones activas de un curso
    @Query("SELECT dc FROM DocenteCurso dc JOIN FETCH dc.docente WHERE dc.curso.id = :cursoId AND dc.active = true")
    List<DocenteCurso> findActivasByCurso(@Param("cursoId") UUID cursoId);
 
    // Verificar si ya existe la asignación (activa o no)
    Optional<DocenteCurso> findByDocente_IdAndCurso_Id(UUID docenteId, UUID cursoId);
 
    // Todos los docentes con sus cursos activos (para la vista general del admin)
    @Query("""
        SELECT dc FROM DocenteCurso dc
        JOIN FETCH dc.docente d
        JOIN FETCH dc.curso c
        WHERE dc.active = true
        ORDER BY d.fullName ASC, c.nombre ASC
        """)
    List<DocenteCurso> findAllActivasConDetalle();
 
    // ¿Existe asignación activa entre este docente y este curso?
    boolean existsByDocente_IdAndCurso_IdAndActiveTrue(UUID docenteId, UUID cursoId);

    // VISTA INICIO
    @Query("""
        SELECT dc FROM DocenteCurso dc
        JOIN FETCH dc.curso c
        WHERE dc.docente.id = :docenteId
          AND dc.anioPeriodo = :anioPeriodo
          AND dc.active = true
    """)
    List<DocenteCurso> findCursosInicioByDocente(
        @Param("docenteId") UUID docenteId, 
        @Param("anioPeriodo") String anioPeriodo
    );
}
