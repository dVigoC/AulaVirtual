package com.aula.backend.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.aula.backend.dtos.LimpiezaDto;
import com.aula.backend.service.LimpiezaService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/limpieza")
@RequiredArgsConstructor
public class LimpiezaController {
 
    private final LimpiezaService service;
 
    // GET /api/admin/limpieza/periodos
    // Lista todos los períodos que tienen datos
    @GetMapping("/periodos")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<String>> getPeriodos() {
        return ResponseEntity.ok(service.getPeriodosDisponibles());
    }
 
    // GET /api/admin/limpieza/preview/{periodo}
    // Vista previa: cuántos registros y archivos se borrarían
    @GetMapping("/preview/{periodo}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<LimpiezaDto.Preview> getPreview(
            @PathVariable String periodo) {
        return ResponseEntity.ok(service.getPreview(periodo));
    }
 
    // DELETE /api/admin/limpieza/periodo/{periodo}
    // Elimina todos los datos y archivos del período indicado
    @DeleteMapping("/periodo/{periodo}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<LimpiezaDto.Resultado> eliminarPeriodo(
            @PathVariable String periodo) {
        return ResponseEntity.ok(service.eliminarPeriodo(periodo));
    }
}