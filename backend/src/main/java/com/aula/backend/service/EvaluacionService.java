package com.aula.backend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;


import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.aula.backend.dtos.EvaluacionDto;
import com.aula.backend.enums.PublicacionTipo;
import com.aula.backend.enums.UserRole;
import com.aula.backend.model.Nota;
import com.aula.backend.model.Publicacion;
import com.aula.backend.model.User;
import com.aula.backend.repository.EntregaEstudianteRepository;
import com.aula.backend.repository.MatriculaRepository;
import com.aula.backend.repository.NotaRepository;
import com.aula.backend.repository.PublicacionRepository;
import com.aula.backend.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EvaluacionService {
    
    
    private final NotaRepository            notaRepo;
    private final PublicacionRepository     pubRepo;
    private final MatriculaRepository       matriculaRepo;
    private final EntregaEstudianteRepository entregaRepo;
    private final UserRepository            userRepo;
 
    // ── Tipos evaluables ──────────────────────────────────────────────────────
    private static final List<PublicacionTipo> TIPOS_EVALUABLES =
        List.of(PublicacionTipo.TAREA, PublicacionTipo.EVALUACION);
 
    // =========================================================================
    //  VISTA DOCENTE / ADMIN — cursos con sus publicaciones evaluables
    // =========================================================================
 
    /**
     * Devuelve la lista de cursos visibles para el usuario según su rol,
     * cada uno con sus publicaciones TAREA/EVALUACION y el resumen de notas.
     *
     * ADMIN  → todos los cursos del periodo
     * DOCENTE → solo los cursos asignados a él en el periodo
     */
    @Transactional(readOnly = true)
    public List<EvaluacionDto.CursoEvaluacionResponse> getCursosParaEvaluar(
            UUID userId, UserRole role) {
 
        // Reutilizamos el servicio de publicaciones para obtener los cursos del usuario
        String periodo = PublicacionService.calcularPeriodo();
        List<com.aula.backend.dtos.CursoInicioDto.Response> cursosInicio =
            getCursosInicioInterno(userId, role, periodo);
 
        List<EvaluacionDto.CursoEvaluacionResponse> resultado = new ArrayList<>();
 
        for (var curso : cursosInicio) {
            UUID cursoId = curso.getCursoId();
 
            // Publicaciones evaluables del curso en el periodo
            List<Publicacion> pubs = pubRepo
                .findByCursoIdAndAnioPeriodoAndTipoInOrderByCreatedAtAsc(
                    cursoId, periodo, TIPOS_EVALUABLES);
 
            if (pubs.isEmpty()) {
                resultado.add(EvaluacionDto.CursoEvaluacionResponse.builder()
                    .cursoId(cursoId)
                    .cursoCodigo(curso.getCursoCodigo())
                    .cursoNombre(curso.getCursoNombre())
                    .anioPeriodo(periodo)
                    .totalPublicaciones(0)
                    .publicaciones(List.of())
                    .build());
                continue;
            }
 
            List<UUID> pubIds = pubs.stream().map(Publicacion::getId).toList();
 
            // Conteo de notas por publicación
            Map<UUID, Long> notasPorPub = notaRepo.countByPublicacionIds(pubIds)
                .stream()
                .collect(Collectors.toMap(
                    row -> (UUID)  row[0],
                    row -> (Long)  row[1]
                ));
 
            // Total matriculados activos en el curso
            int totalMat = matriculaRepo.countByCursoIdAndActiveTrue1(cursoId);
 
            // Total entregas por publicación
            Map<UUID, Long> entregasPorPub = entregaRepo
                .countByPublicacionIds(pubIds)
                .stream()
                .collect(Collectors.toMap(
                    row -> (UUID) row[0],
                    row -> (Long) row[1]
                ));
 
            List<EvaluacionDto.PublicacionResumenItem> items = pubs.stream()
                .map(p -> EvaluacionDto.PublicacionResumenItem.builder()
                    .publicacionId(p.getId())
                    .titulo(p.getTitulo() != null ? p.getTitulo() : p.getDescripcion())
                    .tipo(p.getTipo())
                    .fechaLimite(p.getFechaLimite())
                    .totalMatriculados(totalMat)
                    .totalCalificados(notasPorPub.getOrDefault(p.getId(), 0L).intValue())
                    .totalEntregas(entregasPorPub.getOrDefault(p.getId(), 0L).intValue())
                    .build())
                .toList();
 
            resultado.add(EvaluacionDto.CursoEvaluacionResponse.builder()
                .cursoId(cursoId)
                .cursoCodigo(curso.getCursoCodigo())
                .cursoNombre(curso.getCursoNombre())
                .anioPeriodo(periodo)
                .totalPublicaciones(pubs.size())
                .publicaciones(items)
                .build());
        }
 
        return resultado;
    }
 
    // =========================================================================
    //  VISTA DOCENTE / ADMIN — detalle de una publicación con todos los estudiantes
    // =========================================================================
 
    @Transactional(readOnly = true)
    public EvaluacionDto.PublicacionConNotasResponse getPublicacionConNotas(
            UUID publicacionId) {
 
        Publicacion pub = pubRepo.findById(publicacionId)
            .orElseThrow(() -> new EntityNotFoundException("Publicación no encontrada"));
 
        // Estudiantes activos matriculados en el curso de esta publicación
        List<User> matriculados = matriculaRepo
            .findEstudiantesActivosByCursoId(pub.getCurso().getId());
 
        // Notas ya registradas en esta publicación
        Map<UUID, Nota> notasPorEstudiante = notaRepo
            .findByPublicacionId(publicacionId)
            .stream()
            .collect(Collectors.toMap(n -> n.getEstudiante().getId(), n -> n));
 
        // IDs de estudiantes que entregaron
        List<UUID> estudianteIds = matriculados.stream().map(User::getId).toList();
        Set<UUID> entregaron = entregaRepo
            .findEntregadasIdsByEstudiantesAndPublicacion(estudianteIds, publicacionId);
 
        List<EvaluacionDto.EstudianteNotaItem> items = matriculados.stream()
            .map(est -> {
                Nota n = notasPorEstudiante.get(est.getId());
                return EvaluacionDto.EstudianteNotaItem.builder()
                    .estudianteId(est.getId())
                    .estudianteNombre(est.getFullName())
                    .estudianteEmail(est.getEmail())
                    .notaId(n != null ? n.getId() : null)
                    .nota(n != null ? n.getNota() : null)
                    .comentario(n != null ? n.getComentario() : null)
                    .entregado(entregaron.contains(est.getId()))
                    .notaAt(n != null ? n.getUpdatedAt() : null)
                    .build();
            })
            .toList();
 
        return EvaluacionDto.PublicacionConNotasResponse.builder()
            .publicacionId(pub.getId())
            .titulo(pub.getTitulo() != null ? pub.getTitulo() : pub.getDescripcion())
            .tipo(pub.getTipo())
            .anioPeriodo(pub.getAnioPeriodo())
            .fechaLimite(pub.getFechaLimite())
            .totalMatriculados(matriculados.size())
            .totalCalificados((int) items.stream().filter(i -> i.getNota() != null).count())
            .estudiantes(items)
            .build();
    }
 
    // =========================================================================
    //  REGISTRAR / ACTUALIZAR NOTA  (upsert)
    // =========================================================================
 
    @Transactional
    public EvaluacionDto.NotaResponse registrarNota(
            EvaluacionDto.RegistrarNotaRequest req, UUID registradorId) {
 
        Publicacion pub = pubRepo.findById(req.getPublicacionId())
            .orElseThrow(() -> new EntityNotFoundException("Publicación no encontrada"));
 
        User estudiante = userRepo.findById(req.getEstudianteId())
            .orElseThrow(() -> new EntityNotFoundException("Estudiante no encontrado"));
 
        User registrador = userRepo.findById(registradorId)
            .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado"));
 
        // Upsert: si ya existe la nota, actualizarla
        Nota nota = notaRepo
            .findByPublicacionIdAndEstudianteId(req.getPublicacionId(), req.getEstudianteId())
            .orElseGet(() -> Nota.builder()
                .publicacion(pub)
                .estudiante(estudiante)
                .build());
 
        nota.setNota(req.getNota());
        nota.setComentario(req.getComentario());
        nota.setRegistradoPor(registrador);
        nota = notaRepo.save(nota);
 
        return toNotaResponse(nota);
    }
 
    // =========================================================================
    //  ELIMINAR NOTA
    // =========================================================================
 
    @Transactional
    public void eliminarNota(UUID notaId, UUID userId, UserRole role) {
        Nota nota = notaRepo.findById(notaId)
            .orElseThrow(() -> new EntityNotFoundException("Nota no encontrada"));
 
        // El docente solo puede eliminar notas de publicaciones propias
        if (role == UserRole.DOCENTE &&
            !nota.getPublicacion().getDocente().getId().equals(userId)) {
            throw new SecurityException("No tienes permiso para eliminar esta nota");
        }
 
        notaRepo.delete(nota);
    }
 
    // =========================================================================
    //  VISTA ESTUDIANTE — mis calificaciones por curso
    // =========================================================================
 
    @Transactional(readOnly = true)
    public List<EvaluacionDto.MisCalificacionesResponse> getMisCalificaciones(UUID estudianteId) {
 
        String periodo = PublicacionService.calcularPeriodo();
 
        // Cursos en los que está matriculado activo
        List<com.aula.backend.model.Matricula> matriculas =
            matriculaRepo.findByEstudianteIdAndActiveTrueAndAnioPeriodo(estudianteId, periodo);
 
        List<EvaluacionDto.MisCalificacionesResponse> resultado = new ArrayList<>();
 
        for (var matricula : matriculas) {
            UUID cursoId = matricula.getCurso().getId();
 
            // Publicaciones evaluables del curso en el periodo
            List<Publicacion> pubs = pubRepo
                .findByCursoIdAndAnioPeriodoAndTipoInOrderByCreatedAtAsc(
                    cursoId, periodo, TIPOS_EVALUABLES);
 
            if (pubs.isEmpty()) {
                resultado.add(EvaluacionDto.MisCalificacionesResponse.builder()
                    .cursoId(cursoId)
                    .cursoCodigo(matricula.getCurso().getCodigo())
                    .cursoNombre(matricula.getCurso().getNombre())
                    .anioPeriodo(periodo)
                    .docenteNombre(null)
                    .calificaciones(List.of())
                    .promedio(null)
                    .build());
                continue;
            }
 
            List<UUID> pubIds = pubs.stream().map(Publicacion::getId).toList();
 
            // Notas del estudiante en esas publicaciones
            Map<UUID, Nota> notasPorPub = notaRepo
                .findByEstudianteAndCursoAndPeriodo(estudianteId, cursoId, periodo)
                .stream()
                .collect(Collectors.toMap(n -> n.getPublicacion().getId(), n -> n));
 
            // IDs de publicaciones donde entregó
            Set<UUID> entregadas = Set.copyOf(
                entregaRepo.findEntregadasIds(estudianteId, pubIds));
 
            List<EvaluacionDto.CalificacionItem> items = pubs.stream()
                .map(p -> {
                    Nota n = notasPorPub.get(p.getId());
                    return EvaluacionDto.CalificacionItem.builder()
                        .publicacionId(p.getId())
                        .titulo(p.getTitulo() != null ? p.getTitulo() : p.getDescripcion())
                        .tipo(p.getTipo())
                        .fechaLimite(p.getFechaLimite())
                        .entregado(entregadas.contains(p.getId()))
                        .notaId(n != null ? n.getId() : null)
                        .nota(n != null ? n.getNota() : null)
                        .comentarioDocente(n != null ? n.getComentario() : null)
                        .notaAt(n != null ? n.getUpdatedAt() : null)
                        .build();
                })
                .toList();
 
            // Promedio solo de notas registradas
            BigDecimal promedio = items.stream()
                .filter(i -> i.getNota() != null)
                .map(EvaluacionDto.CalificacionItem::getNota)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
 
            long conNota = items.stream().filter(i -> i.getNota() != null).count();
            BigDecimal promedioFinal = conNota > 0
                ? promedio.divide(BigDecimal.valueOf(conNota), 2, RoundingMode.HALF_UP)
                : null;
 
            // Nombre del docente (primera publicación)
            String docenteNombre = pubs.isEmpty() ? null
                : pubs.get(0).getDocente().getFullName();
 
            resultado.add(EvaluacionDto.MisCalificacionesResponse.builder()
                .cursoId(cursoId)
                .cursoCodigo(matricula.getCurso().getCodigo())
                .cursoNombre(matricula.getCurso().getNombre())
                .anioPeriodo(periodo)
                .docenteNombre(docenteNombre)
                .calificaciones(items)
                .promedio(promedioFinal)
                .build());
        }
 
        return resultado;
    }
 
    // =========================================================================
    //  HELPER INTERNO: delega en PublicacionService para obtener cursos
    // =========================================================================
 
   // ── DESPUÉS ──────────────────────────────────────────────────────
private List<com.aula.backend.dtos.CursoInicioDto.Response> getCursosInicioInterno(
        UUID userId, UserRole role, String periodo) {

    boolean esDocente = (role == UserRole.DOCENTE);

    return pubRepo.findCursosInicioRaw(userId, role.name(), periodo)
        .stream()
        .map(r -> {
            UUID   cursoId      = (UUID)   r[0];
            String cursoCodigo  = (String) r[1];
            String cursoNombre  = (String) r[2];
            String descripcion  = (String) r[3];
            int    creditos     = r[4] != null ? ((Number) r[4]).intValue() : 0;
            String anioPeriodo  = (String) r[5];
            String portadaUrl   = (String) r[6];    // nullable
            String docenteNombre= (String) r[7];    // nullable

            int totalEstudiantes = matriculaRepo.countByCursoIdAndActiveTrue1(cursoId);

            return com.aula.backend.dtos.CursoInicioDto.Response.builder()
                .cursoId(cursoId)
                .cursoCodigo(cursoCodigo)
                .cursoNombre(cursoNombre)
                .descripcion(descripcion)
                .creditos(creditos)
                .anioPeriodo(anioPeriodo)
                .portadaUrl(portadaUrl)
                .docenteNombre(docenteNombre)
                .totalEstudiantes(totalEstudiantes)
                .esDocente(esDocente)
                .build();
        })
        .toList();
}
 
    // =========================================================================
    //  MAPPER
    // =========================================================================
 
    private EvaluacionDto.NotaResponse toNotaResponse(Nota n) {
        return EvaluacionDto.NotaResponse.builder()
            .id(n.getId())
            .publicacionId(n.getPublicacion().getId())
            .publicacionTitulo(n.getPublicacion().getTitulo())
            .publicacionTipo(n.getPublicacion().getTipo())
            .estudianteId(n.getEstudiante().getId())
            .estudianteNombre(n.getEstudiante().getFullName())
            .estudianteEmail(n.getEstudiante().getEmail())
            .registradoPorId(n.getRegistradoPor() != null ? n.getRegistradoPor().getId() : null)
            .registradoPorNombre(n.getRegistradoPor() != null ? n.getRegistradoPor().getFullName() : null)
            .nota(n.getNota())
            .comentario(n.getComentario())
            .createdAt(n.getCreatedAt())
            .updatedAt(n.getUpdatedAt())
            .build();
    }
}
