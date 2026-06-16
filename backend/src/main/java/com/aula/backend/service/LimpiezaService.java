package com.aula.backend.service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.aula.backend.dtos.LimpiezaDto;
import com.aula.backend.repository.AsistenciaRepository;
import com.aula.backend.repository.ClaseRepository;
import com.aula.backend.repository.CursoPortadaRepository;
import com.aula.backend.repository.EntregaEstudianteRepository;
import com.aula.backend.repository.MatriculaRepository;
import com.aula.backend.repository.PublicacionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class LimpiezaService {
 
    private final PublicacionRepository publicacionRepo;
    private final EntregaEstudianteRepository entregaRepo;
    private final CursoPortadaRepository portadaRepo;
    private final ClaseRepository claseRepo;
    private final AsistenciaRepository asistenciaRepo;
    private final MatriculaRepository matriculaRepo;
    private final RestTemplate restTemplate;
 
    @Value("${supabase.url}")
    private String supabaseUrl;
 
    @Value("${supabase.service-role-key}")
    private String supabaseServiceKey;
 
    private static final String BUCKET = "archivos-aula";
 
    // ── Vista previa: qué se borraría ─────────────────────────────────────────
    public LimpiezaDto.Preview getPreview(String periodo) {
        // Recopilar URLs de archivos
        List<String> urlsPublicaciones = publicacionRepo
                .findArchivoUrlsByPeriodo(periodo);
        List<String> urlsEntregas = entregaRepo
                .findArchivoUrlsByPeriodo(periodo);
        List<String> urlsPortadas = portadaRepo
                .findImagenUrlsByPeriodo(periodo);
 
        int totalArchivos = urlsPublicaciones.size()
                          + urlsEntregas.size()
                          + urlsPortadas.size();
 
        // Períodos disponibles para el selector
        List<String> periodos = publicacionRepo.findDistinctPeriodos();
 
        return LimpiezaDto.Preview.builder()
                .periodo(periodo)
                .totalPublicaciones(publicacionRepo.countByPeriodo(periodo))
                .totalEntregas(entregaRepo.countByPeriodo(periodo))
                .totalPortadas(portadaRepo.countByPeriodo(periodo))
                .totalClases(claseRepo.countByAnioPeriodo(periodo))
                .totalAsistencias(asistenciaRepo.countByPeriodo(periodo))
                .totalMatriculas(matriculaRepo.countByAnioPeriodo(periodo))
                .totalArchivosStorage(totalArchivos)
                .periodosDisponibles(periodos)
                .build();
    }
 
    // ── Lista de períodos disponibles ─────────────────────────────────────────
    public List<String> getPeriodosDisponibles() {
        return publicacionRepo.findDistinctPeriodos();
    }
 
    // ── Eliminar todo el período ──────────────────────────────────────────────
    @Transactional
    public LimpiezaDto.Resultado eliminarPeriodo(String periodo) {
 
        // 1. Recopilar URLs antes de borrar
        List<String> urls = new ArrayList<>();
        urls.addAll(publicacionRepo.findArchivoUrlsByPeriodo(periodo));
        urls.addAll(entregaRepo.findArchivoUrlsByPeriodo(periodo));
        urls.addAll(portadaRepo.findImagenUrlsByPeriodo(periodo));
 
        // Filtrar nulls y vacíos
        urls = urls.stream()
                .filter(u -> u != null && !u.isBlank())
                .collect(Collectors.toList());
 
        // 2. Eliminar archivos de Supabase Storage
        int eliminados = 0;
        int fallidos   = 0;
        for (String url : urls) {
            try {
                String path = extraerPath(url);
                if (path != null) {
                    eliminarDeStorage(path);
                    eliminados++;
                }
            } catch (Exception e) {
                log.warn("No se pudo eliminar archivo de Storage: {}", url, e);
                fallidos++;
            }
        }
 
        // 3. Contar antes de borrar (para el resumen)
        int cntPublicaciones = publicacionRepo.countByPeriodo(periodo);
        int cntEntregas      = entregaRepo.countByPeriodo(periodo);
        int cntPortadas      = portadaRepo.countByPeriodo(periodo);
        int cntClases        = claseRepo.countByAnioPeriodo(periodo);
        int cntAsistencias   = asistenciaRepo.countByPeriodo(periodo);
        int cntMatriculas    = matriculaRepo.countByAnioPeriodo(periodo);
 
        // 4. Eliminar en BD (orden por FK)
        //    entregas → publicaciones → portadas → asistencias → clases → matriculas
        entregaRepo.deleteByPeriodo(periodo);
        publicacionRepo.deleteByAnioPeriodo(periodo);
        portadaRepo.deleteByPeriodo(periodo);
        asistenciaRepo.deleteByPeriodo(periodo);
        claseRepo.deleteByAnioPeriodo(periodo);
        matriculaRepo.deleteByAnioPeriodo(periodo);
 
        log.info("Período {} eliminado: {} publicaciones, {} entregas, {} clases, {} archivos",
                periodo, cntPublicaciones, cntEntregas, cntClases, eliminados);
 
        return LimpiezaDto.Resultado.builder()
                .periodo(periodo)
                .publicacionesEliminadas(cntPublicaciones)
                .entregasEliminadas(cntEntregas)
                .portadasEliminadas(cntPortadas)
                .clasesEliminadas(cntClases)
                .asistenciasEliminadas(cntAsistencias)
                .matriculasEliminadas(cntMatriculas)
                .archivosStorageEliminados(eliminados)
                .archivosStorageFallidos(fallidos)
                .mensaje("Período " + periodo + " eliminado correctamente.")
                .build();
    }
 
    // ── Helpers ───────────────────────────────────────────────────────────────
 
    // Extrae el path relativo desde la URL pública de Supabase
    // Ej: https://xxx.supabase.co/storage/v1/object/public/archivos-aula/portadas/uuid/img.jpg
    //     → portadas/uuid/img.jpg
    private String extraerPath(String url) {
        String marker = "/archivos-aula/";
        int idx = url.indexOf(marker);
        if (idx < 0) return null;
        return url.substring(idx + marker.length());
    }
 
    // Llama a la API de Supabase Storage para eliminar un archivo
    private void eliminarDeStorage(String path) {
        String endpoint = supabaseUrl
                + "/storage/v1/object/" + BUCKET + "/" + path;
 
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + supabaseServiceKey);
        headers.set("apikey", supabaseServiceKey);
 
        restTemplate.exchange(
                endpoint,
                HttpMethod.DELETE,
                new HttpEntity<>(headers),
                Void.class
        );
    }
}