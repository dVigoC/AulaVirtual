package com.aula.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.aula.backend.model.CursoPortada;

@Repository
public interface CursoPortadaRepository extends JpaRepository<CursoPortada, UUID> {
 
    Optional<CursoPortada> findByCursoIdAndDocenteId(UUID cursoId, UUID docenteId);
 
    // La portada más reciente de cualquier docente para ese curso
    Optional<CursoPortada> findFirstByCursoIdOrderByUpdatedAtDesc(UUID cursoId);

    //MODULO LIMPIEZA
    @Query("SELECT cp.imagenUrl FROM CursoPortada cp WHERE cp.curso.id IN (SELECT DISTINCT m.curso.id FROM Matricula m WHERE m.anioPeriodo = :periodo)")
    List<String> findImagenUrlsByPeriodo(@Param("periodo") String periodo);
    
    @Query("SELECT COUNT(cp) FROM CursoPortada cp WHERE cp.curso.id IN (SELECT DISTINCT m.curso.id FROM Matricula m WHERE m.anioPeriodo = :periodo)")
    int countByPeriodo(@Param("periodo") String periodo);
    
    @Modifying
    @Query("DELETE FROM CursoPortada cp WHERE cp.curso.id IN (SELECT DISTINCT m.curso.id FROM Matricula m WHERE m.anioPeriodo = :periodo)")
    void deleteByPeriodo(@Param("periodo") String periodo);

}
 