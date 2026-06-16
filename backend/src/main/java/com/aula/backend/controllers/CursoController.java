package com.aula.backend.controllers;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.aula.backend.dtos.CursoDto;
import com.aula.backend.service.CursoService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/cursos")
@CrossOrigin(origins = "*", allowedHeaders = "*")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class CursoController {
    
    private final CursoService cursoService;
 
    // ════════════════════════════════════════════════════════════════
    //  CRUD CURSOS
    // ════════════════════════════════════════════════════════════════
 
    // GET /api/admin/cursos?search=&isActive=&page=0&size=10
    @GetMapping
    public ResponseEntity<CursoDto.PageResponse> listCursos(
            @RequestParam(required = false)            String  search,
            @RequestParam(required = false)            Boolean isActive,
            @RequestParam(defaultValue = "0")          int     page,
            @RequestParam(defaultValue = "20")         int     size) {
        return ResponseEntity.ok(cursoService.findAllCursos(search, isActive, page, size));
    }
 
    // GET /api/admin/cursos/{id}
    @GetMapping("/{id}")
    public ResponseEntity<CursoDto.Response> getCurso(@PathVariable UUID id) {
        return ResponseEntity.ok(cursoService.findCursoById(id));
    }
 
    // POST /api/admin/cursos
    @PostMapping
    public ResponseEntity<CursoDto.Response> createCurso(
            @Valid @RequestBody CursoDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cursoService.createCurso(req));
    }
 
    // PUT /api/admin/cursos/{id}
    @PutMapping("/{id}")
    public ResponseEntity<CursoDto.Response> updateCurso(
            @PathVariable UUID id,
            @Valid @RequestBody CursoDto.UpdateRequest req) {
        return ResponseEntity.ok(cursoService.updateCurso(id, req));
    }
 
    // PATCH /api/admin/cursos/{id}/status?active=true|false
    @PatchMapping("/{id}/status")
    public ResponseEntity<CursoDto.Response> setCursoActive(
            @PathVariable UUID id,
            @RequestParam boolean active) {
        return ResponseEntity.ok(cursoService.setCursoActive(id, active));
    }
 
    // DELETE /api/admin/cursos/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCurso(@PathVariable UUID id) {
        cursoService.deleteCurso(id);
        return ResponseEntity.noContent().build();
    }
 
    // ════════════════════════════════════════════════════════════════
    //  ASIGNACIONES DOCENTE ↔ CURSO
    // ════════════════════════════════════════════════════════════════
 
    // POST /api/admin/cursos/asignaciones
    // Body: { docenteId, cursoIds: [uuid, uuid, ...] }
    @PostMapping("/asignaciones")
    public ResponseEntity<List<CursoDto.AsignacionResponse>> asignar(
            @Valid @RequestBody CursoDto.AsignacionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(cursoService.asignarCursos(req));
    }
 
    // DELETE /api/admin/cursos/asignaciones/{asignacionId}
    @DeleteMapping("/asignaciones/{asignacionId}")
    public ResponseEntity<Void> removerAsignacion(@PathVariable UUID asignacionId) {
        cursoService.removerAsignacion(asignacionId);
        return ResponseEntity.noContent().build();
    }
 
    // GET /api/admin/cursos/docente/{docenteId}
    // Todos los cursos asignados a un docente específico
    @GetMapping("/docente/{docenteId}")
    public ResponseEntity<List<CursoDto.AsignacionResponse>> getCursosByDocente(
            @PathVariable UUID docenteId) {
        return ResponseEntity.ok(cursoService.getCursosByDocente(docenteId));
    }
 
    // GET /api/admin/cursos/docentes-con-cursos
    // Vista completa: todos los docentes con sus cursos asignados
    @GetMapping("/docentes-con-cursos")
    public ResponseEntity<List<CursoDto.DocenteConCursosResponse>> getDocentesConCursos() {
        return ResponseEntity.ok(cursoService.getDocentesConCursos());
    }
}
