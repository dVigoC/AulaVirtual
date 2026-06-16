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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.aula.backend.dtos.EstudianteDto;
import com.aula.backend.service.EstudianteService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/estudiantes")
@CrossOrigin(origins = "*", allowedHeaders = "*")
@RequiredArgsConstructor
public class EstudianteController {

    private final EstudianteService estudianteService;
 
    // ════════════════════════════════════════════════════════════════
    //  CURSOS CON ESTUDIANTES
    //  ADMIN → todos los cursos activos con sus estudiantes
    //  DOCENTE → solo sus cursos asignados con sus estudiantes
    // ════════════════════════════════════════════════════════════════
 
    // GET /api/estudiantes/cursos-con-estudiantes
    @GetMapping("/cursos-con-estudiantes")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<List<EstudianteDto.CursoConEstudiantesResponse>> getCursosConEstudiantes() {
        return ResponseEntity.ok(estudianteService.getCursosConEstudiantes());
    }
 
    // ════════════════════════════════════════════════════════════════
    //  MATRÍCULAS
    // ════════════════════════════════════════════════════════════════
 
    // POST /api/estudiantes/matriculas
    @PostMapping("/matriculas")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<EstudianteDto.MatriculaResponse>> matricular(
            @Valid @RequestBody EstudianteDto.MatricularRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(estudianteService.matricularEstudiantes(req));
    }
 
    // DELETE /api/estudiantes/matriculas/{matriculaId}
    @DeleteMapping("/matriculas/{matriculaId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> removerMatricula(@PathVariable UUID matriculaId) {
        estudianteService.removerMatricula(matriculaId);
        return ResponseEntity.noContent().build();
    }
 
    // GET /api/estudiantes/matriculas/curso/{cursoId}
    @GetMapping("/matriculas/curso/{cursoId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<List<EstudianteDto.MatriculaResponse>> getMatriculasByCurso(
            @PathVariable UUID cursoId) {
        return ResponseEntity.ok(estudianteService.getMatriculasByCurso(cursoId));
    }
 
    // ════════════════════════════════════════════════════════════════
    //  CLASES
    // ════════════════════════════════════════════════════════════════
 
    // POST /api/estudiantes/clases
    @PostMapping("/clases")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<EstudianteDto.ClaseResponse> crearClase(
            @Valid @RequestBody EstudianteDto.CreateClaseRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(estudianteService.crearClase(req));
    }
 
    // GET /api/estudiantes/clases/curso/{cursoId}
    @GetMapping("/clases/curso/{cursoId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<List<EstudianteDto.ClaseResponse>> getClasesByCurso(
            @PathVariable UUID cursoId) {
        return ResponseEntity.ok(estudianteService.getClasesByCurso(cursoId));
    }
 
    // PATCH /api/estudiantes/clases/{claseId}/inicio
    @PatchMapping("/clases/{claseId}/inicio")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<EstudianteDto.ClaseResponse> marcarInicio(
            @PathVariable UUID claseId) {
        return ResponseEntity.ok(estudianteService.marcarInicio(claseId));
    }
 
    // PATCH /api/estudiantes/clases/{claseId}/fin
    @PatchMapping("/clases/{claseId}/fin")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<EstudianteDto.ClaseResponse> marcarFin(
            @PathVariable UUID claseId) {
        return ResponseEntity.ok(estudianteService.marcarFin(claseId));
    }
 
    // ════════════════════════════════════════════════════════════════
    //  ASISTENCIAS
    // ════════════════════════════════════════════════════════════════
 
    // POST /api/estudiantes/asistencias
    @PostMapping("/asistencias")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<EstudianteDto.ClaseConAsistenciasResponse> registrarAsistencias(
            @Valid @RequestBody EstudianteDto.RegistrarAsistenciaRequest req) {
        return ResponseEntity.ok(estudianteService.registrarAsistencias(req));
    }
 
    // GET /api/estudiantes/asistencias/clase/{claseId}
    @GetMapping("/asistencias/clase/{claseId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<EstudianteDto.ClaseConAsistenciasResponse> getAsistenciasByClase(
            @PathVariable UUID claseId) {
        return ResponseEntity.ok(estudianteService.getClaseConAsistencias(claseId));
    }
 
    // GET /api/estudiantes/asistencias/resumen?estudianteId=&cursoId=
    @GetMapping("/asistencias/resumen")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<EstudianteDto.ResumenAsistenciaResponse> getResumenAsistencia(
            @RequestParam UUID estudianteId,
            @RequestParam UUID cursoId) {
        return ResponseEntity.ok(
                estudianteService.getResumenAsistencia(estudianteId, cursoId));
    }
    
}
