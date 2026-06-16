package com.aula.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.aula.backend.model.Asistencia;

@Repository
public interface AsistenciaRepository extends JpaRepository<Asistencia, UUID> {
 
    // Todas las asistencias de una clase con datos del estudiante
    @Query("""
        SELECT a FROM Asistencia a
        JOIN FETCH a.estudiante
        WHERE a.clase.id = :claseId
        ORDER BY a.estudiante.fullName ASC NULLS LAST
        """)
    List<Asistencia> findByClaseId(@Param("claseId") UUID claseId);
 
    // Asistencia de un estudiante en una clase (para update)
    Optional<Asistencia> findByClase_IdAndEstudiante_Id(UUID claseId, UUID estudianteId);
 
    // Historial de asistencia de un estudiante en un curso
    @Query("""
        SELECT a FROM Asistencia a
        JOIN FETCH a.clase c
        WHERE a.estudiante.id = :estudianteId
          AND c.curso.id      = :cursoId
        ORDER BY c.fecha DESC
        """)
    List<Asistencia> findByEstudianteAndCurso(
        @Param("estudianteId") UUID estudianteId,
        @Param("cursoId")      UUID cursoId
    );
 
    // Contar por estado en una clase (para resumen)
    long countByClase_IdAndEstado(UUID claseId, com.aula.backend.enums.AsistenciaEstado estado);

    //MODULO LIMPIEZA

    @Query("SELECT COUNT(a) FROM Asistencia a JOIN a.clase c WHERE c.anioPeriodo = :periodo")
    int countByPeriodo(@Param("periodo") String periodo);
    
    @Modifying
    @Query("DELETE FROM Asistencia a WHERE a.clase IN (SELECT c FROM Clase c WHERE c.anioPeriodo = :periodo)")
    void deleteByPeriodo(@Param("periodo") String periodo);
}
