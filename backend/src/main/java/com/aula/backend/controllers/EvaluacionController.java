package com.aula.backend.controllers;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.aula.backend.dtos.EvaluacionDto;
import com.aula.backend.model.User;
import com.aula.backend.service.EvaluacionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/evaluaciones")
@RequiredArgsConstructor
public class EvaluacionController {
    
    
    private final EvaluacionService service;
 
    // ── ADMIN / DOCENTE ───────────────────────────────────────────────────────
 
    /**
     * GET /api/evaluaciones/cursos
     * Devuelve los cursos con sus publicaciones evaluables.
     * ADMIN → todos los cursos. DOCENTE → solo los suyos.
     */
    @GetMapping("/cursos")
    @PreAuthorize("hasAnyRole('ADMIN','DOCENTE')")
    public ResponseEntity<List<EvaluacionDto.CursoEvaluacionResponse>> getCursos(
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(
            service.getCursosParaEvaluar(user.getId(), user.getRole()));
    }
 
    /**
     * GET /api/evaluaciones/publicaciones/{publicacionId}
     * Detalle de una publicación: todos los estudiantes matriculados
     * con su nota (o null si aún no tiene).
     */
    @GetMapping("/publicaciones/{publicacionId}")
    @PreAuthorize("hasAnyRole('ADMIN','DOCENTE')")
    public ResponseEntity<EvaluacionDto.PublicacionConNotasResponse> getPublicacionConNotas(
            @PathVariable UUID publicacionId) {
        return ResponseEntity.ok(service.getPublicacionConNotas(publicacionId));
    }
 
    /**
     * POST /api/evaluaciones/notas
     * Registra o actualiza (upsert) la nota de un estudiante.
     */
    @PostMapping("/notas")
    @PreAuthorize("hasAnyRole('ADMIN','DOCENTE')")
    public ResponseEntity<EvaluacionDto.NotaResponse> registrarNota(
            @RequestBody EvaluacionDto.RegistrarNotaRequest req,
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(service.registrarNota(req, user.getId()));
    }
 
    /**
     * DELETE /api/evaluaciones/notas/{notaId}
     * Elimina una nota. El docente solo puede eliminar notas de sus publicaciones.
     */
    @DeleteMapping("/notas/{notaId}")
    @PreAuthorize("hasAnyRole('ADMIN','DOCENTE')")
    public ResponseEntity<Void> eliminarNota(
            @PathVariable UUID notaId,
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        service.eliminarNota(notaId, user.getId(), user.getRole());
        return ResponseEntity.noContent().build();
    }
 
    // ── ESTUDIANTE ────────────────────────────────────────────────────────────
 
    /**
     * GET /api/evaluaciones/mis-calificaciones
     * El estudiante ve sus notas en todos sus cursos del periodo actual.
     */
    @GetMapping("/mis-calificaciones")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<EvaluacionDto.MisCalificacionesResponse>> getMisCalificaciones(
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(service.getMisCalificaciones(user.getId()));
    }
}
