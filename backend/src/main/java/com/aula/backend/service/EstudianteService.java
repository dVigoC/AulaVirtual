package com.aula.backend.service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.aula.backend.dtos.EstudianteDto;
import com.aula.backend.enums.AsistenciaEstado;
import com.aula.backend.enums.UserRole;
import com.aula.backend.model.Asistencia;
import com.aula.backend.model.Clase;
import com.aula.backend.model.Curso;
import com.aula.backend.model.DocenteCurso;
import com.aula.backend.model.Matricula;
import com.aula.backend.model.User;
import com.aula.backend.repository.AsistenciaRepository;
import com.aula.backend.repository.ClaseRepository;
import com.aula.backend.repository.CursoRepository;
import com.aula.backend.repository.DocenteCursoRepository;
import com.aula.backend.repository.MatriculaRepository;
import com.aula.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EstudianteService {
    
    private final MatriculaRepository    matriculaRepository;
    private final ClaseRepository        claseRepository;
    private final AsistenciaRepository   asistenciaRepository;
    private final CursoRepository        cursoRepository;
    private final DocenteCursoRepository docenteCursoRepository;
    private final UserRepository         userRepository;
 
    // ── Helper: usuario autenticado ──────────────────────────────────
    private User getUsuarioActual() {
        String email = SecurityContextHolder.getContext()
                .getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }
 
    // ════════════════════════════════════════════════════════════════
    //  CURSOS CON ESTUDIANTES
    //  ADMIN → todos los cursos activos
    //  DOCENTE → solo sus cursos asignados activos
    // ════════════════════════════════════════════════════════════════
    @Transactional(readOnly = true)
    public List<EstudianteDto.CursoConEstudiantesResponse> getCursosConEstudiantes() {
        User actor = getUsuarioActual();
 
        List<Curso> cursos;
        if (actor.getRole() == UserRole.ADMIN) {
            cursos = cursoRepository.findAll().stream()
                    .filter(c -> Boolean.TRUE.equals(c.getActive()))
                    .sorted(Comparator.comparing(Curso::getNombre))
                    .collect(Collectors.toList());
        } else {
            // DOCENTE: solo cursos asignados activos
            cursos = docenteCursoRepository.findActivasByDocente(actor.getId())
                    .stream()
                    .map(DocenteCurso::getCurso)
                    .filter(c -> Boolean.TRUE.equals(c.getActive()))
                    .sorted(Comparator.comparing(Curso::getNombre))
                    .collect(Collectors.toList());
        }
 
        return cursos.stream()
                .map(curso -> buildCursoConEstudiantes(curso, actor))
                .collect(Collectors.toList());
    }
 
    private EstudianteDto.CursoConEstudiantesResponse buildCursoConEstudiantes(
            Curso curso, User actor) {
 
        // Buscar docente asignado al curso (primer asignado activo)
        String docenteNombre = null;
        String docenteEmail  = null;
       /* List<DocenteCurso> asignaciones = docenteCursoRepository
                .findActivasByDocente(actor.getRole() == UserRole.ADMIN
                        ? null : actor.getId());*/
 
        // Para admin, buscamos el primer docente asignado al curso
        if (actor.getRole() == UserRole.ADMIN) {
            List<DocenteCurso> todos = docenteCursoRepository.findAll().stream()
                    .filter(dc -> Boolean.TRUE.equals(dc.getActive())
                            && dc.getCurso().getId().equals(curso.getId()))
                    .collect(Collectors.toList());
            if (!todos.isEmpty()) {
                User d = todos.get(0).getDocente();
                docenteNombre = d.getFullName();
                docenteEmail  = d.getEmail();
            }
        } else {
            docenteNombre = actor.getFullName();
            docenteEmail  = actor.getEmail();
        }
 
        List<Matricula> matriculas = matriculaRepository.findActivasByCurso(curso.getId());
 
        EstudianteDto.CursoConEstudiantesResponse dto =
                new EstudianteDto.CursoConEstudiantesResponse();
        dto.setCursoId(curso.getId());
        dto.setCursoNombre(curso.getNombre());
        dto.setCursoCodigo(curso.getCodigo());
        dto.setCursoCreditos(curso.getCreditos());
        dto.setCursoActive(Boolean.TRUE.equals(curso.getActive()));
        dto.setDocenteNombre(docenteNombre);
        dto.setDocenteEmail(docenteEmail);
        dto.setTotalEstudiantes(matriculas.size());
        dto.setEstudiantes(matriculas.stream()
                .map(m -> toEstudianteResponse(m.getEstudiante()))
                .collect(Collectors.toList()));
 
        // Periodo: el más reciente de las matrículas de este curso
        dto.setAnioPeriodo(matriculas.stream()
                .map(Matricula::getAnioPeriodo)
                .max(Comparator.naturalOrder())
                .orElse("—"));
 
        return dto;
    }
 
    // ════════════════════════════════════════════════════════════════
    //  MATRÍCULAS
    // ════════════════════════════════════════════════════════════════
 
    @Transactional
    public List<EstudianteDto.MatriculaResponse> matricularEstudiantes(
            EstudianteDto.MatricularRequest req) {
        User admin = getUsuarioActual();
 
        Curso curso = cursoRepository.findById(req.getCursoId())
                .orElseThrow(() -> new RuntimeException("Curso no encontrado"));
 
        List<EstudianteDto.MatriculaResponse> resultado = new ArrayList<>();
 
        for (UUID estudianteId : req.getEstudianteIds()) {
            User estudiante = userRepository.findById(estudianteId)
                    .orElseThrow(() -> new RuntimeException(
                            "Estudiante no encontrado: " + estudianteId));
 
            if (estudiante.getRole() != UserRole.ESTUDIANTE)
                throw new RuntimeException(
                        "El usuario no tiene rol ESTUDIANTE: " + estudiante.getEmail());
 
            // Si ya existe la matrícula la reactivamos
            Matricula mat = matriculaRepository
                    .findByEstudianteAndCursoAndPeriodo(
                            estudianteId, req.getCursoId(), req.getAnioPeriodo())
                    .orElse(null);
 
            if (mat == null) {
                mat = new Matricula();
                mat.setEstudiante(estudiante);
                mat.setCurso(curso);
                mat.setAnioPeriodo(req.getAnioPeriodo());
            }
            mat.setMatriculadoPor(admin);
            mat.setActive(true);
 
            resultado.add(toMatriculaResponse(matriculaRepository.save(mat)));
        }
        return resultado;
    }
 
    @Transactional
    public void removerMatricula(UUID matriculaId) {
        Matricula mat = matriculaRepository.findById(matriculaId)
                .orElseThrow(() -> new RuntimeException("Matrícula no encontrada"));
        mat.setActive(false);
        matriculaRepository.save(mat);
    }
 
    @Transactional(readOnly = true)
    public List<EstudianteDto.MatriculaResponse> getMatriculasByCurso(UUID cursoId) {
        return matriculaRepository.findActivasByCurso(cursoId)
                .stream().map(this::toMatriculaResponse).collect(Collectors.toList());
    }
 
    // ════════════════════════════════════════════════════════════════
    //  CLASES
    // ════════════════════════════════════════════════════════════════
 
    @Transactional
    public EstudianteDto.ClaseResponse crearClase(EstudianteDto.CreateClaseRequest req) {
        User actor = getUsuarioActual();
 
        Curso curso = cursoRepository.findById(req.getCursoId())
                .orElseThrow(() -> new RuntimeException("Curso no encontrado"));
 
        User docente = actor;
        if (req.getDocenteId() != null) {
            docente = userRepository.findById(req.getDocenteId())
                    .orElseThrow(() -> new RuntimeException("Docente no encontrado"));
        }
 
        Clase clase = new Clase();
        clase.setCurso(curso);
        clase.setDocente(docente);
        clase.setTitulo(req.getTitulo());
        clase.setFecha(req.getFecha());
        clase.setAnioPeriodo(req.getAnioPeriodo());
        clase.setCreadoPor(actor);
 
        return toClaseResponse(claseRepository.save(clase));
    }
 
    @Transactional
    public EstudianteDto.ClaseResponse marcarInicio(UUID claseId) {
        Clase clase = claseRepository.findById(claseId)
                .orElseThrow(() -> new RuntimeException("Clase no encontrada"));
        if (clase.getHoraInicio() != null)
            throw new RuntimeException("La clase ya fue iniciada");
        clase.setHoraInicio(OffsetDateTime.now());
        return toClaseResponse(claseRepository.save(clase));
    }
 
    @Transactional
    public EstudianteDto.ClaseResponse marcarFin(UUID claseId) {
        Clase clase = claseRepository.findById(claseId)
                .orElseThrow(() -> new RuntimeException("Clase no encontrada"));
        if (clase.getHoraInicio() == null)
            throw new RuntimeException("La clase no ha sido iniciada aún");
        if (clase.getHoraFin() != null)
            throw new RuntimeException("La clase ya fue finalizada");
        clase.setHoraFin(OffsetDateTime.now());
        return toClaseResponse(claseRepository.save(clase));
    }

    @Transactional(readOnly = true)
    public List<EstudianteDto.ClaseResponse> getClasesByCurso(UUID cursoId) {
        return claseRepository.findByCursoId(cursoId)
                .stream().map(this::toClaseResponse).collect(Collectors.toList());
    }
 
    // ════════════════════════════════════════════════════════════════
    //  ASISTENCIAS
    // ════════════════════════════════════════════════════════════════
 
    @Transactional
    public EstudianteDto.ClaseConAsistenciasResponse registrarAsistencias(
            EstudianteDto.RegistrarAsistenciaRequest req) {
        User actor = getUsuarioActual();
 
        Clase clase = claseRepository.findById(req.getClaseId())
                .orElseThrow(() -> new RuntimeException("Clase no encontrada"));
 
        for (EstudianteDto.AsistenciaItem item : req.getAsistencias()) {
            User estudiante = userRepository.findById(item.getEstudianteId())
                    .orElseThrow(() -> new RuntimeException(
                            "Estudiante no encontrado: " + item.getEstudianteId()));
 
            Asistencia asistencia = asistenciaRepository
                    .findByClase_IdAndEstudiante_Id(clase.getId(), estudiante.getId())
                    .orElse(null);
 
            if (asistencia == null) {
                asistencia = new Asistencia();
                asistencia.setClase(clase);
                asistencia.setEstudiante(estudiante);
            }
            asistencia.setEstado(item.getEstado());
            asistencia.setObservacion(item.getObservacion());
            asistencia.setRegistradoPor(actor);
            asistenciaRepository.save(asistencia);
        }
 
        return getClaseConAsistencias(clase.getId());
    }

 
    @Transactional(readOnly = true)
    public EstudianteDto.ClaseConAsistenciasResponse getClaseConAsistencias(UUID claseId) {
        Clase clase = claseRepository.findById(claseId)
                .orElseThrow(() -> new RuntimeException("Clase no encontrada"));
 
        List<Asistencia> asistencias = asistenciaRepository.findByClaseId(claseId);
 
        EstudianteDto.ClaseConAsistenciasResponse resp =
                new EstudianteDto.ClaseConAsistenciasResponse();
        resp.setClase(toClaseResponse(clase));
        resp.setAsistencias(asistencias.stream()
                .map(this::toAsistenciaResponse).collect(Collectors.toList()));
        resp.setTotalPresentes(asistencias.stream()
                .filter(a -> a.getEstado() == AsistenciaEstado.PRESENTE).count());
        resp.setTotalTardanzas(asistencias.stream()
                .filter(a -> a.getEstado() == AsistenciaEstado.TARDANZA).count());
        resp.setTotalAusentes(asistencias.stream()
                .filter(a -> a.getEstado() == AsistenciaEstado.AUSENTE).count());
        resp.setTotalJustificados(asistencias.stream()
                .filter(a -> a.getEstado() == AsistenciaEstado.JUSTIFICADO).count());
        return resp;
    }
 
    @Transactional(readOnly = true)
    public EstudianteDto.ResumenAsistenciaResponse getResumenAsistencia(
            UUID estudianteId, UUID cursoId) {
        User estudiante = userRepository.findById(estudianteId)
                .orElseThrow(() -> new RuntimeException("Estudiante no encontrado"));
        Curso curso = cursoRepository.findById(cursoId)
                .orElseThrow(() -> new RuntimeException("Curso no encontrado"));
 
        List<Asistencia> hist = asistenciaRepository
                .findByEstudianteAndCurso(estudianteId, cursoId);
 
        long presentes    = hist.stream().filter(a -> a.getEstado() == AsistenciaEstado.PRESENTE).count();
        long tardanzas    = hist.stream().filter(a -> a.getEstado() == AsistenciaEstado.TARDANZA).count();
        long ausentes     = hist.stream().filter(a -> a.getEstado() == AsistenciaEstado.AUSENTE).count();
        long justificados = hist.stream().filter(a -> a.getEstado() == AsistenciaEstado.JUSTIFICADO).count();
        long total        = hist.size();
 
        EstudianteDto.ResumenAsistenciaResponse res =
                new EstudianteDto.ResumenAsistenciaResponse();
        res.setEstudianteId(estudianteId);
        res.setEstudianteNombre(estudiante.getFullName());
        res.setCursoId(cursoId);
        res.setCursoNombre(curso.getNombre());
        res.setTotalClases(total);
        res.setPresentes(presentes);
        res.setTardanzas(tardanzas);
        res.setAusentes(ausentes);
        res.setJustificados(justificados);
        res.setPorcentajeAsistencia(
                total > 0 ? (double)(presentes + tardanzas) / total * 100 : 0.0);
        return res;
    }
 
    // ════════════════════════════════════════════════════════════════
    //  MAPPERS
    // ════════════════════════════════════════════════════════════════
 
    private EstudianteDto.EstudianteResponse toEstudianteResponse(User u) {
        EstudianteDto.EstudianteResponse r = new EstudianteDto.EstudianteResponse();
        r.setId(u.getId());
        r.setFullName(u.getFullName());
        r.setEmail(u.getEmail());
        r.setUsername(u.getUsername());
        r.setActive(Boolean.TRUE.equals(u.getActive()));
        return r;
    }
 
    private EstudianteDto.MatriculaResponse toMatriculaResponse(Matricula m) {
        EstudianteDto.MatriculaResponse r = new EstudianteDto.MatriculaResponse();
        r.setId(m.getId());
        r.setEstudiante(toEstudianteResponse(m.getEstudiante()));
        r.setCursoId(m.getCurso().getId());
        r.setCursoNombre(m.getCurso().getNombre());
        r.setCursoCodigo(m.getCurso().getCodigo());
        r.setAnioPeriodo(m.getAnioPeriodo());
        r.setActive(Boolean.TRUE.equals(m.getActive()));
        r.setMatriculadoAt(m.getMatriculadoAt());
        if (m.getMatriculadoPor() != null)
            r.setMatriculadoPorNombre(m.getMatriculadoPor().getFullName());
        return r;
    }
 
    private EstudianteDto.ClaseResponse toClaseResponse(Clase c) {
        EstudianteDto.ClaseResponse r = new EstudianteDto.ClaseResponse();
        r.setId(c.getId());
        r.setCursoId(c.getCurso().getId());
        r.setCursoNombre(c.getCurso().getNombre());
        r.setCursoCodigo(c.getCurso().getCodigo());
        r.setTitulo(c.getTitulo());
        r.setFecha(c.getFecha());
        r.setHoraInicio(c.getHoraInicio());
        r.setHoraFin(c.getHoraFin());
        r.setAnioPeriodo(c.getAnioPeriodo());
        r.setCreatedAt(c.getCreatedAt());
        if (c.getDocente() != null)
            r.setDocenteNombre(c.getDocente().getFullName());
 
        // Estado y horas dictadas
        if (c.getHoraInicio() == null) {
            r.setEstado("SIN_INICIAR");
            r.setHorasDictadas(0.0);
        } else if (c.getHoraFin() == null) {
            r.setEstado("EN_CURSO");
            double hrs = Duration.between(c.getHoraInicio(), OffsetDateTime.now())
                    .toMinutes() / 60.0;
            r.setHorasDictadas(Math.round(hrs * 10.0) / 10.0);
        } else {
            r.setEstado("FINALIZADA");
            double hrs = Duration.between(c.getHoraInicio(), c.getHoraFin())
                    .toMinutes() / 60.0;
            r.setHorasDictadas(Math.round(hrs * 10.0) / 10.0);
        }
        return r;
    }
 
    private EstudianteDto.AsistenciaResponse toAsistenciaResponse(Asistencia a) {
        EstudianteDto.AsistenciaResponse r = new EstudianteDto.AsistenciaResponse();
        r.setId(a.getId());
        r.setClaseId(a.getClase().getId());
        r.setEstudiante(toEstudianteResponse(a.getEstudiante()));
        r.setEstado(a.getEstado());
        r.setObservacion(a.getObservacion());
        r.setCreatedAt(a.getCreatedAt());
        r.setUpdatedAt(a.getUpdatedAt());
        if (a.getRegistradoPor() != null)
            r.setRegistradoPorNombre(a.getRegistradoPor().getFullName());
        return r;
    }
}
