package com.aula.backend.service;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.aula.backend.dtos.CursoInicioDto;
import com.aula.backend.dtos.EntregaDto;
import com.aula.backend.dtos.PortadaDto;
import com.aula.backend.dtos.PublicacionDto;
import com.aula.backend.enums.PublicacionTipo;
import com.aula.backend.enums.UserRole;
import com.aula.backend.exception.AuthException;
import com.aula.backend.model.Curso;
import com.aula.backend.model.CursoPortada;
import com.aula.backend.model.EntregaEstudiante;
import com.aula.backend.model.Publicacion;
import com.aula.backend.model.User;
import com.aula.backend.repository.CursoPortadaRepository;
import com.aula.backend.repository.CursoRepository;
import com.aula.backend.repository.DocenteCursoRepository;
import com.aula.backend.repository.EntregaEstudianteRepository;
import com.aula.backend.repository.MatriculaRepository;
import com.aula.backend.repository.PublicacionRepository;
import com.aula.backend.repository.UserRepository;


import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PublicacionService {
    
     private final PublicacionRepository      pubRepo;
    private final EntregaEstudianteRepository entregaRepo;
    private final CursoPortadaRepository     portadaRepo;
    private final CursoRepository            cursoRepo;
    private final UserRepository             userRepo;
    private final MatriculaRepository        matriculaRepo;
    private final DocenteCursoRepository     docenteCursoRepo;
 
    // ── Calcular semestre automáticamente ────────────────────────────────────
    public static String calcularPeriodo() {
        OffsetDateTime now = OffsetDateTime.now();
        int month = now.getMonthValue();
        int year  = now.getYear();
        String semestre = (month <= 6) ? "I" : "II";
        return year + "-" + semestre;
    }
 
    // ── Mapper: Publicacion → Response ───────────────────────────────────────
    private PublicacionDto.Response toResponse(Publicacion p) {
        return PublicacionDto.Response.builder()
            .id(p.getId())
            .cursoId(p.getCurso().getId())
            .cursoNombre(p.getCurso().getNombre())
            .docenteId(p.getDocente().getId())
            .docenteNombre(p.getDocente().getFullName())
            .tipo(p.getTipo())
            .titulo(p.getTitulo())
            .descripcion(p.getDescripcion())
            .anioPeriodo(p.getAnioPeriodo())
            .linkReunion(p.getLinkReunion())
            .fechaClase(p.getFechaClase())
            .archivoUrl(p.getArchivoUrl())
            .archivoNombre(p.getArchivoNombre())
            .archivoTipo(p.getArchivoTipo())
            .fechaLimite(p.getFechaLimite())
            .permitirEnvioTardio(p.isPermitirEnvioTardio())
            .fechaInicio(p.getFechaInicio())
            .fechaFin(p.getFechaFin())
            .createdAt(p.getCreatedAt())
            .updatedAt(p.getUpdatedAt())
            .vencida(p.getFechaLimite() != null &&
                     OffsetDateTime.now().isAfter(p.getFechaLimite()))
            .build();
    }
 
    // ── Obtener cursos del período para la pantalla de inicio ─────────────────
    @Transactional(readOnly = true)
    public List<CursoInicioDto.Response> getCursosInicio(UUID userId, UserRole role) {
        String periodo = calcularPeriodo();

        if (role == UserRole.ADMIN) {
            return cursoRepo.findByActiveTrue().stream().map(c -> {
                String portada = portadaRepo
                    .findFirstByCursoIdOrderByUpdatedAtDesc(c.getId())
                    .map(CursoPortada::getImagenUrl).orElse(null);
                long total = matriculaRepo.countByCursoIdAndActiveTrue(c.getId());
                return CursoInicioDto.Response.builder()
                    .cursoId(c.getId())
                    .cursoCodigo(c.getCodigo())
                    .cursoNombre(c.getNombre())
                    .descripcion(c.getDescripcion())
                    .creditos(c.getCreditos())
                    .anioPeriodo(periodo)
                    .portadaUrl(portada)
                    .totalEstudiantes((int) total)
                    .esDocente(true)
                    .build();
            }).collect(Collectors.toList());
        }

        if (role == UserRole.DOCENTE) {
            // ← USA EL MÉTODO CORRECTO del repository
            return docenteCursoRepo.findCursosInicioByDocente(userId, periodo)
                .stream().map(dc -> {
                    Curso c = dc.getCurso();
                    String portada = portadaRepo
                        .findFirstByCursoIdOrderByUpdatedAtDesc(c.getId())
                        .map(CursoPortada::getImagenUrl).orElse(null);
                    long total = matriculaRepo.countByCursoIdAndActiveTrue(c.getId());
                    return CursoInicioDto.Response.builder()
                        .cursoId(c.getId())
                        .cursoCodigo(c.getCodigo())
                        .cursoNombre(c.getNombre())
                        .descripcion(c.getDescripcion())
                        .creditos(c.getCreditos())
                        .anioPeriodo(dc.getAnioPeriodo())
                        .portadaUrl(portada)
                        .docenteNombre(dc.getDocente().getFullName())
                        .totalEstudiantes((int) total)
                        .esDocente(true)
                        .build();
                }).collect(Collectors.toList());
        }

        // ESTUDIANTE
        return matriculaRepo.findActivasByEstudiante(userId)
            .stream().map(m -> {
                Curso c = m.getCurso();
                String portada = portadaRepo
                    .findFirstByCursoIdOrderByUpdatedAtDesc(c.getId())
                    .map(CursoPortada::getImagenUrl).orElse(null);

                // Buscar docente del curso
                String docenteNombre = docenteCursoRepo.findActivasByCurso(c.getId())
                    .stream().findFirst()
                    .map(dc -> dc.getDocente().getFullName())
                    .orElse(null);

                return CursoInicioDto.Response.builder()
                    .cursoId(c.getId())
                    .cursoCodigo(c.getCodigo())
                    .cursoNombre(c.getNombre())
                    .descripcion(c.getDescripcion())
                    .creditos(c.getCreditos())
                    .anioPeriodo(m.getAnioPeriodo())
                    .portadaUrl(portada)
                    .docenteNombre(docenteNombre)
                    .totalEstudiantes(0)
                    .esDocente(false)
                    .build();
            }).collect(Collectors.toList());
    }
    // ── Listar publicaciones de un curso ─────────────────────────────────────
    @Transactional(readOnly = true)
    public List<PublicacionDto.Response> getPublicaciones(
            UUID cursoId, String periodo, UUID callerId, UserRole role) {
 
        List<Publicacion> pubs = pubRepo.findByCursoAndPeriodo(cursoId, periodo);
 
        if (role == UserRole.ESTUDIANTE) {
            // Qué publicaciones ya entregó
            List<UUID> ids = pubs.stream().map(Publicacion::getId).collect(Collectors.toList());
            Set<UUID> entregadas = ids.isEmpty() ? Set.of()
                : new HashSet<>(entregaRepo.findEntregadasIds(callerId, ids));
 
            return pubs.stream().map(p -> {
                PublicacionDto.Response r = toResponse(p);
                r.setEntregado(entregadas.contains(p.getId()));
                return r;
            }).collect(Collectors.toList());
        }
 
        // Docente / Admin: cuántos entregaron
        return pubs.stream().map(p -> {
            PublicacionDto.Response r = toResponse(p);
            if (p.getTipo() == PublicacionTipo.TAREA ||
                p.getTipo() == PublicacionTipo.EVALUACION) {
                r.setTotalEntregas((long) entregaRepo.findByPublicacionId(p.getId()).size());
            }
            return r;
        }).collect(Collectors.toList());
    }
 
    // ── Crear publicación ─────────────────────────────────────────────────────
    @Transactional
    public PublicacionDto.Response createPublicacion(
            PublicacionDto.CreateRequest req, UUID docenteId) {
 
        Curso curso = cursoRepo.findById(req.getCursoId())
            .orElseThrow(() -> new AuthException("Curso no encontrado", HttpStatus.NOT_FOUND));
        User docente = userRepo.findById(docenteId)
            .orElseThrow(() -> new AuthException("Usuario no encontrado", HttpStatus.NOT_FOUND));
 
        Publicacion p = Publicacion.builder()
            .curso(curso)
            .docente(docente)
            .tipo(req.getTipo())
            .titulo(req.getTitulo())
            .descripcion(req.getDescripcion())
            .anioPeriodo(req.getAnioPeriodo() != null ? req.getAnioPeriodo() : calcularPeriodo())
            .linkReunion(req.getLinkReunion())
            .fechaClase(req.getFechaClase())
            .archivoUrl(req.getArchivoUrl())
            .archivoNombre(req.getArchivoNombre())
            .archivoTipo(req.getArchivoTipo())
            .fechaLimite(req.getFechaLimite())
            .permitirEnvioTardio(Boolean.TRUE.equals(req.getPermitirEnvioTardio()))
            .fechaInicio(req.getFechaInicio())
            .fechaFin(req.getFechaFin())
            .build();
 
        return toResponse(pubRepo.save(p));
    }
 
    // ── Eliminar publicación ──────────────────────────────────────────────────
    @Transactional
    public void deletePublicacion(UUID pubId, UUID callerId, UserRole role) {
        Publicacion p = pubRepo.findById(pubId)
            .orElseThrow(() -> new AuthException("Publicación no encontrada", HttpStatus.NOT_FOUND));
 
        // Solo el docente dueño o un admin puede eliminar
        if (role != UserRole.ADMIN && !p.getDocente().getId().equals(callerId)) {
            throw new AuthException("Sin permiso para eliminar esta publicación",HttpStatus.FORBIDDEN);
        }
        pubRepo.delete(p);
    }
 
    // ── Actualizar permiso de envío tardío ────────────────────────────────────
    @Transactional
    public PublicacionDto.Response updatePermisoTardio(
            UUID pubId, boolean permitir, UUID callerId, UserRole role) {
        Publicacion p = pubRepo.findById(pubId)
            .orElseThrow(() -> new AuthException("Publicación no encontrada", HttpStatus.NOT_FOUND));
        if (role != UserRole.ADMIN && !p.getDocente().getId().equals(callerId)) {
            throw new AuthException("Sin permiso", HttpStatus.FORBIDDEN);
        }
        p.setPermitirEnvioTardio(permitir);
        return toResponse(pubRepo.save(p));
    }
 
    // ── Ver entregas de una publicación (docente / admin) ─────────────────────
    @Transactional(readOnly = true)
    public List<EntregaDto.Response> getEntregas(UUID pubId) {
        return entregaRepo.findByPublicacionId(pubId).stream().map(e ->
            EntregaDto.Response.builder()
                .id(e.getId())
                .publicacionId(e.getPublicacion().getId())
                .estudianteId(e.getEstudiante().getId())
                .estudianteNombre(e.getEstudiante().getFullName())
                .estudianteEmail(e.getEstudiante().getEmail())
                .archivoUrl(e.getArchivoUrl())
                .archivoNombre(e.getArchivoNombre())
                .archivoTipo(e.getArchivoTipo())
                .linkEntrega(e.getLinkEntrega())
                .comentario(e.getComentario())
                .entregadoAt(e.getEntregadoAt())
                .updatedAt(e.getUpdatedAt())
                .build()
        ).collect(Collectors.toList());
    }
 
    // ── Crear / actualizar entrega de estudiante ──────────────────────────────
    @Transactional
    public EntregaDto.Response crearEntrega(EntregaDto.CreateRequest req, UUID estudianteId) {
        Publicacion pub = pubRepo.findById(req.getPublicacionId())
            .orElseThrow(() -> new AuthException("Publicación no encontrada", HttpStatus.NOT_FOUND));
 
        // Verificar fecha límite
        if (!pub.isPermitirEnvioTardio() && pub.getFechaLimite() != null
                && OffsetDateTime.now().isAfter(pub.getFechaLimite())) {
            throw new AuthException(
                "La fecha límite de entrega ha vencido.", HttpStatus.BAD_REQUEST);
        }
 
        User est = userRepo.findById(estudianteId)
            .orElseThrow(() -> new AuthException("Estudiante no encontrado", HttpStatus.NOT_FOUND));
 
        // Upsert: si ya existe, actualizar
        EntregaEstudiante entrega = entregaRepo
            .findByPublicacionIdAndEstudianteId(pub.getId(), estudianteId)
            .orElse(EntregaEstudiante.builder()
                .publicacion(pub)
                .estudiante(est)
                .build());
 
        entrega.setArchivoUrl(req.getArchivoUrl());
        entrega.setArchivoNombre(req.getArchivoNombre());
        entrega.setArchivoTipo(req.getArchivoTipo());
        entrega.setLinkEntrega(req.getLinkEntrega());
        entrega.setComentario(req.getComentario());
 
        EntregaEstudiante saved = entregaRepo.save(entrega);
        return EntregaDto.Response.builder()
            .id(saved.getId())
            .publicacionId(pub.getId())
            .estudianteId(est.getId())
            .estudianteNombre(est.getFullName())
            .estudianteEmail(est.getEmail())
            .archivoUrl(saved.getArchivoUrl())
            .archivoNombre(saved.getArchivoNombre())
            .archivoTipo(saved.getArchivoTipo())
            .linkEntrega(saved.getLinkEntrega())
            .comentario(saved.getComentario())
            .entregadoAt(saved.getEntregadoAt())
            .updatedAt(saved.getUpdatedAt())
            .build();
    }
 
    // ── Gestionar portada de curso ────────────────────────────────────────────
    @Transactional
    public PortadaDto.Response upsertPortada(UUID cursoId, String imagenUrl, UUID docenteId) {
        Curso curso = cursoRepo.findById(cursoId)
            .orElseThrow(() -> new AuthException("Curso no encontrado", HttpStatus.NOT_FOUND));
        User docente = userRepo.findById(docenteId)
            .orElseThrow(() -> new AuthException("Docente no encontrado", HttpStatus.NOT_FOUND));
 
        CursoPortada portada = portadaRepo
            .findByCursoIdAndDocenteId(cursoId, docenteId)
            .orElse(CursoPortada.builder().curso(curso).docente(docente).build());
 
        portada.setImagenUrl(imagenUrl);
        CursoPortada saved = portadaRepo.save(portada);
        return PortadaDto.Response.builder()
            .id(saved.getId())
            .cursoId(cursoId)
            .imagenUrl(saved.getImagenUrl())
            .updatedAt(saved.getUpdatedAt())
            .build();
    }
}
