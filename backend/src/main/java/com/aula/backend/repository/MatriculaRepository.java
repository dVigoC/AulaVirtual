package com.aula.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.aula.backend.model.Matricula;
import com.aula.backend.model.User;

@Repository
public interface MatriculaRepository extends JpaRepository<Matricula, UUID> {
 
    // Todas las matrículas activas de un curso
    @Query("""
        SELECT m FROM Matricula m
        JOIN FETCH m.estudiante
        WHERE m.curso.id = :cursoId
          AND m.active = true
        ORDER BY m.estudiante.fullName ASC NULLS LAST
        """)
    List<Matricula> findActivasByCurso(@Param("cursoId") UUID cursoId);
 
    // Todas las matrículas activas de un estudiante
    @Query("""
        SELECT m FROM Matricula m
        JOIN FETCH m.curso
        WHERE m.estudiante.id = :estudianteId
          AND m.active = true
        """)
    List<Matricula> findActivasByEstudiante(@Param("estudianteId") UUID estudianteId);
 
    // Verificar si ya existe matrícula
    @Query("""
        SELECT m FROM Matricula m
        WHERE m.estudiante.id = :estudianteId
          AND m.curso.id      = :cursoId
          AND m.anioPeriodo   = :anioPeriodo
        """)
    Optional<Matricula> findByEstudianteAndCursoAndPeriodo(
        @Param("estudianteId") UUID estudianteId,
        @Param("cursoId")      UUID cursoId,
        @Param("anioPeriodo")  String anioPeriodo
    );
 
    // Matrículas activas de un curso en un periodo
    @Query("""
        SELECT m FROM Matricula m
        JOIN FETCH m.estudiante
        WHERE m.curso.id    = :cursoId
          AND m.anioPeriodo = :periodo
          AND m.active      = true
        ORDER BY m.estudiante.fullName ASC NULLS LAST
        """)
    List<Matricula> findActivasByCursoAndPeriodo(
        @Param("cursoId") UUID cursoId,
        @Param("periodo") String periodo
    );
 
    // Contar matriculados activos por curso
    long countByCursoIdAndActiveTrue(UUID cursoId);

   
    // VISTA INICIO: Cursos donde el estudiante está matriculado con JOIN FETCH
    @Query("""
        SELECT m FROM Matricula m
        JOIN FETCH m.curso c
        WHERE m.estudiante.id = :estudianteId
          AND m.anioPeriodo = :anioPeriodo
          AND m.active = true
    """)
    List<Matricula> findCursosInicioByEstudiante(
        @Param("estudianteId") UUID estudianteId, 
        @Param("anioPeriodo") String anioPeriodo
    );

    //MODULO LIMPIEZA
    int countByAnioPeriodo(String anioPeriodo);
 
    @Modifying
    @Query("DELETE FROM Matricula m WHERE m.anioPeriodo = :periodo")
    void deleteByAnioPeriodo(@Param("periodo") String periodo);

    // VISTA EVALUACIONES: Estudiantes matriculados en un curso y periodo
      /** Cuenta estudiantes activos matriculados en un curso */
    @Query("SELECT COUNT(m) FROM Matricula m WHERE m.curso.id = :cursoId AND m.active = TRUE")
    int countByCursoIdAndActiveTrue1(@Param("cursoId") UUID cursoId);
 
    /** Lista de objetos User de estudiantes activos en un curso */
    @Query("""
        SELECT m.estudiante FROM Matricula m
        WHERE m.curso.id = :cursoId
          AND m.active   = TRUE
        ORDER BY m.estudiante.fullName ASC
    """)
    List<User> findEstudiantesActivosByCursoId(@Param("cursoId") UUID cursoId);
 
    /** Matrículas activas de un estudiante en un periodo (para vista calificaciones) */
    List<Matricula> findByEstudianteIdAndActiveTrueAndAnioPeriodo(
        UUID estudianteId, String anioPeriodo
    );
}
