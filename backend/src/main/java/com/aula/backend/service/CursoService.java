package com.aula.backend.service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.aula.backend.dtos.CursoDto;
import com.aula.backend.enums.UserRole;
import com.aula.backend.model.Curso;
import com.aula.backend.model.DocenteCurso;
import com.aula.backend.model.User;
import com.aula.backend.repository.CursoRepository;
import com.aula.backend.repository.DocenteCursoRepository;
import com.aula.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CursoService {
 
    private final CursoRepository       cursoRepository;
    private final DocenteCursoRepository docenteCursoRepository;
    private final UserRepository        userRepository;
 
    // ── Helper: obtener admin autenticado ────────────────────────────
    private User getAdminActual() {
        String email = SecurityContextHolder.getContext()
                .getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Admin no encontrado"));
    }
 
    // ════════════════════════════════════════════════════════════════
    //  CRUD DE CURSOS
    // ════════════════════════════════════════════════════════════════
 
    // ── Listar cursos con filtros y paginación ───────────────────────
    public CursoDto.PageResponse findAllCursos(String search, Boolean isActive,
                                               int page, int size) {
        Page<Curso> result = cursoRepository.findAllWithFilters(
                (search != null && !search.isBlank()) ? search.trim() : null,
                isActive,
                PageRequest.of(page, size));
 
        CursoDto.PageResponse response = new CursoDto.PageResponse();
        response.setContent(result.getContent().stream().map(this::toCursoResponse).toList());
        response.setPage(result.getNumber());
        response.setSize(result.getSize());
        response.setTotalElements(result.getTotalElements());
        response.setTotalPages(result.getTotalPages());
        return response;
    }
 
    // ── Obtener curso por ID ─────────────────────────────────────────
    public CursoDto.Response findCursoById(UUID id) {
        return toCursoResponse(cursoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Curso no encontrado")));
    }
 
    // ── Crear curso ──────────────────────────────────────────────────
    @Transactional
    public CursoDto.Response createCurso(CursoDto.CreateRequest req) {
        if (cursoRepository.existsByCodigo(req.getCodigo().toUpperCase()))
            throw new RuntimeException("El código de curso ya existe: " + req.getCodigo());
 
        Curso curso = new Curso();
        curso.setCodigo(req.getCodigo().toUpperCase().trim());
        curso.setNombre(req.getNombre().trim());
        curso.setDescripcion(req.getDescripcion());
        curso.setCreditos(req.getCreditos() != null ? req.getCreditos() : 0);
        curso.setActive(true);
 
        return toCursoResponse(cursoRepository.save(curso));
    }
 
    // ── Actualizar curso ─────────────────────────────────────────────
    @Transactional
    public CursoDto.Response updateCurso(UUID id, CursoDto.UpdateRequest req) {
        Curso curso = cursoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Curso no encontrado"));
 
        if (req.getCodigo() != null && !req.getCodigo().equalsIgnoreCase(curso.getCodigo())) {
            if (cursoRepository.existsByCodigoAndIdNot(req.getCodigo().toUpperCase(), id))
                throw new RuntimeException("El código de curso ya existe: " + req.getCodigo());
            curso.setCodigo(req.getCodigo().toUpperCase().trim());
        }
        if (req.getNombre()      != null) curso.setNombre(req.getNombre().trim());
        if (req.getDescripcion() != null) curso.setDescripcion(req.getDescripcion());
        if (req.getCreditos()    != null) curso.setCreditos(req.getCreditos());
 
        return toCursoResponse(cursoRepository.save(curso));
    }
 
    // ── Activar / desactivar curso ───────────────────────────────────
    @Transactional
    public CursoDto.Response setCursoActive(UUID id, boolean active) {
        Curso curso = cursoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Curso no encontrado"));
        curso.setActive(active);
        return toCursoResponse(cursoRepository.save(curso));
    }
 
    // ── Eliminar curso ───────────────────────────────────────────────
    @Transactional
    public void deleteCurso(UUID id) {
        if (!cursoRepository.existsById(id))
            throw new RuntimeException("Curso no encontrado");
        cursoRepository.deleteById(id);
    }
 
    // ════════════════════════════════════════════════════════════════
    //  ASIGNACIONES DOCENTE ↔ CURSO
    // ════════════════════════════════════════════════════════════════
 
    // ── Asignar uno o varios cursos a un docente ─────────────────────
    @Transactional
    public List<CursoDto.AsignacionResponse> asignarCursos(CursoDto.AsignacionRequest req) {
        User admin   = getAdminActual();
        User docente = userRepository.findById(req.getDocenteId())
                .orElseThrow(() -> new RuntimeException("Docente no encontrado"));
 
        if (docente.getRole() != UserRole.DOCENTE)
            throw new RuntimeException("El usuario seleccionado no tiene rol DOCENTE");
 
        List<CursoDto.AsignacionResponse> resultado = new ArrayList<>();
 
        for (UUID cursoId : req.getCursoIds()) {
            Curso curso = cursoRepository.findById(cursoId)
                    .orElseThrow(() -> new RuntimeException("Curso no encontrado: " + cursoId));
 
            // Si ya existe la asignación la reactivamos, si no la creamos
            DocenteCurso dc = docenteCursoRepository
                    .findByDocente_IdAndCurso_Id(docente.getId(), curso.getId())
                    .orElse(null);
 
            if (dc == null) {
                dc = new DocenteCurso();
                dc.setDocente(docente);
                dc.setCurso(curso);
            }
            dc.setAnioPeriodo(req.getAnioPeriodo());  // ← agrega esto
            dc.setAsignadoPor(admin);
            dc.setActive(true);
 
            resultado.add(toAsignacionResponse(docenteCursoRepository.save(dc)));
        }
 
        return resultado;
    }
 
    // ── Remover asignación (soft-delete: active = false) ─────────────
    @Transactional
    public void removerAsignacion(UUID asignacionId) {
        DocenteCurso dc = docenteCursoRepository.findById(asignacionId)
                .orElseThrow(() -> new RuntimeException("Asignación no encontrada"));
        dc.setActive(false);
        docenteCursoRepository.save(dc);
    }
 
    // ── Obtener todos los cursos de un docente ────────────────────────
    public List<CursoDto.AsignacionResponse> getCursosByDocente(UUID docenteId) {
        userRepository.findById(docenteId)
                .orElseThrow(() -> new RuntimeException("Docente no encontrado"));
        return docenteCursoRepository.findActivasByDocente(docenteId)
                .stream().map(this::toAsignacionResponse).toList();
    }
 
    // ── Vista completa: todos los docentes con sus cursos ────────────
    public List<CursoDto.DocenteConCursosResponse> getDocentesConCursos() {
        // Solo usuarios con rol DOCENTE activos
        List<User> docentes = userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.DOCENTE && Boolean.TRUE.equals(u.getActive()))
                .collect(Collectors.toList());
 
        return docentes.stream().map(docente -> {
            CursoDto.DocenteConCursosResponse dto = new CursoDto.DocenteConCursosResponse();
            dto.setDocenteId(docente.getId());
            dto.setDocenteNombre(docente.getFullName());
            dto.setDocenteEmail(docente.getEmail());
            dto.setDocenteUsername(docente.getUsername());
 
            List<CursoDto.Response> cursos = docenteCursoRepository
                    .findActivasByDocente(docente.getId())
                    .stream()
                    .map(dc -> toCursoResponse(dc.getCurso()))
                    .toList();
 
            dto.setCursos(cursos);
            return dto;
        }).toList();
    }
 
    // ════════════════════════════════════════════════════════════════
    //  MAPPERS
    // ════════════════════════════════════════════════════════════════
 
    private CursoDto.Response toCursoResponse(Curso c) {
        CursoDto.Response r = new CursoDto.Response();
        r.setId(c.getId());
        r.setCodigo(c.getCodigo());
        r.setNombre(c.getNombre());
        r.setDescripcion(c.getDescripcion());
        r.setCreditos(c.getCreditos());
        r.setActive(Boolean.TRUE.equals(c.getActive()));
        r.setCreatedAt(c.getCreatedAt());
        r.setUpdatedAt(c.getUpdatedAt());
        return r;
    }
 
    private CursoDto.AsignacionResponse toAsignacionResponse(DocenteCurso dc) {
        CursoDto.AsignacionResponse r = new CursoDto.AsignacionResponse();
        r.setId(dc.getId());
        r.setDocenteId(dc.getDocente().getId());
        r.setDocenteNombre(dc.getDocente().getFullName());
        r.setDocenteEmail(dc.getDocente().getEmail());
        r.setAsignadoAt(dc.getAsignadoAt());
        r.setActive(Boolean.TRUE.equals(dc.getActive()));
 
        if (dc.getCurso() != null) {
            r.setCursoId(dc.getCurso().getId());
            r.setCursoNombre(dc.getCurso().getNombre());
            r.setCursoCodigo(dc.getCurso().getCodigo());
            r.setCursoCreditos(dc.getCurso().getCreditos());
        }
        if (dc.getAsignadoPor() != null) {
            r.setAsignadoPorNombre(dc.getAsignadoPor().getFullName());
        }
        return r;
    }
}
