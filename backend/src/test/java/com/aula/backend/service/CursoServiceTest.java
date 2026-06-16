package com.aula.backend.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.aula.backend.dtos.CursoDto;
import com.aula.backend.model.Curso;
import com.aula.backend.repository.CursoRepository;
import com.aula.backend.repository.DocenteCursoRepository;
import com.aula.backend.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
public class CursoServiceTest {

    @Mock
    private CursoRepository cursoRepository;

    @Mock
    private DocenteCursoRepository docenteCursoRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CursoService cursoService; // Instancia real inyectada con los mocks de arriba

    // ════════════════════════════════════════════════════════════════
    // PRUEBAS PARA findCursoById
    // ════════════════════════════════════════════════════════════════

    @Test
    public void findCursoById_CuandoCursoExiste_DeberiaRetornarCursoDto() {
        // ARRANGE (Preparar)
        UUID cursoId = UUID.randomUUID();
        Curso cursoMock = new Curso();
        cursoMock.setId(cursoId);
        cursoMock.setCodigo("INF-101");
        cursoMock.setNombre("Introducción a la Informática");
        cursoMock.setActive(true);

        // Simulamos que el repositorio encuentra el curso
        when(cursoRepository.findById(cursoId)).thenReturn(Optional.of(cursoMock));

        // ACT (Actuar)
        CursoDto.Response resultado = cursoService.findCursoById(cursoId);

        // ASSERT (Verificar)
        assertNotNull(resultado);
        assertEquals(cursoId, resultado.getId());
        assertEquals("INF-101", resultado.getCodigo());
        assertEquals("Introducción a la Informática", resultado.getNombre());
        assertTrue(resultado.isActive());
        
        verify(cursoRepository, times(1)).findById(cursoId);
    }

    @Test
    public void findCursoById_CuandoCursoNoExiste_DeberiaLanzarRuntimeException() {
        // ARRANGE
        UUID cursoId = UUID.randomUUID();
        // Simulamos que el repositorio devuelve un Optional vacío
        when(cursoRepository.findById(cursoId)).thenReturn(Optional.empty());

        // ACT & ASSERT
        RuntimeException excepcion = assertThrows(RuntimeException.class, () -> {
            cursoService.findCursoById(cursoId);
        });

        assertEquals("Curso no encontrado", excepcion.getMessage());
        verify(cursoRepository, times(1)).findById(cursoId);
    }

    // ════════════════════════════════════════════════════════════════
    // PRUEBAS PARA createCurso
    // ════════════════════════════════════════════════════════════════

    @Test
    public void createCurso_CuandoCodigoNoExiste_DeberiaGuardarExitosamente() {
        // ARRANGE
        CursoDto.CreateRequest request = new CursoDto.CreateRequest();
        request.setCodigo("  mat-202  "); // Probamos que limpie espacios y pase a mayúsculas
        request.setNombre("Cálculo II ");
        request.setDescripcion("Curso de integrales");
        request.setCreditos((short) 4);

        // Simulamos que no existe el código aún
        when(cursoRepository.existsByCodigo("  MAT-202  ")).thenReturn(false);
        
        // Simulamos el guardado regresando el mismo objeto que procesa el método
        when(cursoRepository.save(any(Curso.class))).thenAnswer(invocation -> {
            Curso cursoGuardado = invocation.getArgument(0);
            cursoGuardado.setId(UUID.randomUUID()); // Simulamos que la BD le genera una ID
            return cursoGuardado;
        });

        // ACT
        CursoDto.Response resultado = cursoService.createCurso(request);

        // ASSERT
        assertNotNull(resultado);
        assertNotNull(resultado.getId());
        assertEquals("MAT-202", resultado.getCodigo()); // Verificamos mayúsculas y trim
        assertEquals("Cálculo II", resultado.getNombre()); // Verificamos trim
        assertEquals((short) 4, resultado.getCreditos());
        assertTrue(resultado.isActive());

        verify(cursoRepository, times(1)).existsByCodigo("  MAT-202  ");
        verify(cursoRepository, times(1)).save(any(Curso.class));
    }

    @Test
    public void createCurso_CuandoCodigoYaExiste_DeberiaLanzarRuntimeException() {
        // ARRANGE
        CursoDto.CreateRequest request = new CursoDto.CreateRequest();
        request.setCodigo("inf-101");
        request.setNombre("Programación");

        // Simulamos que el código ya existe en el sistema
        when(cursoRepository.existsByCodigo("INF-101")).thenReturn(true);

        // ACT & ASSERT
        RuntimeException excepcion = assertThrows(RuntimeException.class, () -> {
            cursoService.createCurso(request);
        });

        assertEquals("El código de curso ya existe: inf-101", excepcion.getMessage());
        
        // El repositorio de guardado NUNCA debió llamarse
        verify(cursoRepository, never()).save(any(Curso.class));
    }

    // ════════════════════════════════════════════════════════════════
    // PRUEBAS PARA deleteCurso
    // ════════════════════════════════════════════════════════════════

    @Test
    public void deleteCurso_CuandoCursoExiste_DeberiaEliminar() {
        // ARRANGE
        UUID cursoId = UUID.randomUUID();
        when(cursoRepository.existsById(cursoId)).thenReturn(true);

        // ACT
        cursoService.deleteCurso(cursoId);

        // ASSERT
        verify(cursoRepository, times(1)).existsById(cursoId);
        verify(cursoRepository, times(1)).deleteById(cursoId);
    }

    @Test
    public void deleteCurso_CuandoCursoNoExiste_DeberiaLanzarExcepcion() {
        // ARRANGE
        UUID cursoId = UUID.randomUUID();
        when(cursoRepository.existsById(cursoId)).thenReturn(false);

        // ACT & ASSERT
        assertThrows(RuntimeException.class, () -> {
            cursoService.deleteCurso(cursoId);
        });

        verify(cursoRepository, never()).deleteById(any(UUID.class));
    }
}