package com.aula.backend.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.aula.backend.model.Curso;

@Repository
public interface CursoRepository extends JpaRepository<Curso, UUID> {
 
    boolean existsByCodigo(String codigo);
    boolean existsByCodigoAndIdNot(String codigo, UUID id);
 
    // Native query — evita el bug de Hibernate 7 con bytea/null en JPQL
    @Query(value = """
        SELECT * FROM auth_app.cursos c
        WHERE (
            :search IS NULL OR :search = ''
            OR LOWER(c.nombre) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(c.codigo) LIKE LOWER(CONCAT('%', :search, '%'))
        )
        AND (:isActive IS NULL OR c.is_active = :isActive)
        ORDER BY c.nombre ASC
        """,
        countQuery = """
        SELECT COUNT(*) FROM auth_app.cursos c
        WHERE (
            :search IS NULL OR :search = ''
            OR LOWER(c.nombre) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(c.codigo) LIKE LOWER(CONCAT('%', :search, '%'))
        )
        AND (:isActive IS NULL OR c.is_active = :isActive)
        """,
        nativeQuery = true)
    Page<Curso> findAllWithFilters(
            @Param("search")   String  search,
            @Param("isActive") Boolean isActive,
            Pageable pageable);

    //VISTA INICIO 
    List<Curso> findByActiveTrue();
}