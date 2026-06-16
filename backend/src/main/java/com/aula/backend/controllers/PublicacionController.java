package com.aula.backend.controllers;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

import com.aula.backend.dtos.CursoInicioDto;
import com.aula.backend.dtos.EntregaDto;
import com.aula.backend.dtos.PortadaDto;
import com.aula.backend.dtos.PublicacionDto;
import com.aula.backend.model.User;
import com.aula.backend.service.PublicacionService;
import org.springframework.security.core.Authentication;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/inicio")
@RequiredArgsConstructor
public class PublicacionController {
    
    private final PublicacionService service;
 
    // ── Pantalla de inicio: lista de cursos del período ───────────────────────
    // GET /api/inicio/cursos
    @GetMapping("/cursos")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CursoInicioDto.Response>> getCursosInicio(
            Authentication authentication) {
        // 3. Extraes y conviertes al usuario manualmente
        User user = (User) authentication.getPrincipal(); 

        return ResponseEntity.ok(
            service.getCursosInicio(user.getId(), user.getRole()));
    }
 
    // ── Publicaciones de un curso ─────────────────────────────────────────────
    // GET /api/inicio/cursos/{cursoId}/publicaciones?periodo=2026-I
    @GetMapping("/cursos/{cursoId}/publicaciones")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PublicacionDto.Response>> getPublicaciones(
            @PathVariable UUID cursoId,
            @RequestParam(required = false) String periodo,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal(); // Casteo manual
        String p = (periodo != null && !periodo.isBlank())
            ? periodo
            : PublicacionService.calcularPeriodo();
        return ResponseEntity.ok(
            service.getPublicaciones(cursoId, p, user.getId(), user.getRole()));
    }
 
    // ── Crear publicación ─────────────────────────────────────────────────────
    // POST /api/inicio/publicaciones
    @PostMapping("/publicaciones")
    @PreAuthorize("hasAnyRole('ADMIN','DOCENTE')")
    public ResponseEntity<PublicacionDto.Response> crear(
            @RequestBody PublicacionDto.CreateRequest req,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal(); // Casteo manual
        return ResponseEntity.ok(service.createPublicacion(req, user.getId()));
    }
 
    // ── Eliminar publicación ──────────────────────────────────────────────────
    // DELETE /api/inicio/publicaciones/{id}
    @DeleteMapping("/publicaciones/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','DOCENTE')")
    public ResponseEntity<Void> eliminar(
            @PathVariable UUID id,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal(); // Casteo manual
        service.deletePublicacion(id, user.getId(), user.getRole());
        return ResponseEntity.noContent().build();
    }
 
    // ── Actualizar permiso de envío tardío ────────────────────────────────────
    // PATCH /api/inicio/publicaciones/{id}/permiso-tardio
    @PatchMapping("/publicaciones/{id}/permiso-tardio")
    @PreAuthorize("hasAnyRole('ADMIN','DOCENTE')")
    public ResponseEntity<PublicacionDto.Response> updatePermiso(
            @PathVariable UUID id,
            @RequestBody PublicacionDto.UpdatePermisoRequest req,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal(); // Casteo manual
        return ResponseEntity.ok(
            service.updatePermisoTardio(id, req.isPermitirEnvioTardio(),
                                        user.getId(), user.getRole()));
    }
 
    // ── Ver entregas de una publicación ──────────────────────────────────────
    // GET /api/inicio/publicaciones/{id}/entregas
    @GetMapping("/publicaciones/{id}/entregas")
    @PreAuthorize("hasAnyRole('ADMIN','DOCENTE')")
    public ResponseEntity<List<EntregaDto.Response>> getEntregas(
            @PathVariable UUID id) {
        return ResponseEntity.ok(service.getEntregas(id));
    }
 
    // ── Crear / actualizar entrega (estudiante) ───────────────────────────────
    // POST /api/inicio/entregas
    @PostMapping("/entregas")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<EntregaDto.Response> crearEntrega(
            @RequestBody EntregaDto.CreateRequest req,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal(); // Casteo manual
        return ResponseEntity.ok(service.crearEntrega(req, user.getId()));
    }
 
    // ── Actualizar portada del curso ──────────────────────────────────────────
    // PUT /api/inicio/cursos/{cursoId}/portada
    @PutMapping("/cursos/{cursoId}/portada")
    @PreAuthorize("hasAnyRole('ADMIN','DOCENTE')")
    public ResponseEntity<PortadaDto.Response> updatePortada(
            @PathVariable UUID cursoId,
            @RequestBody PortadaDto.Request req,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal(); // Casteo manual
        return ResponseEntity.ok(
            service.upsertPortada(cursoId, req.getImagenUrl(), user.getId()));
    }
}
