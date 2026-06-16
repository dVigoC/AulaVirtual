package com.aula.backend.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;


import com.aula.backend.model.User;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    // Login
    // Spring Security busca por email (usamos email como username)
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
    boolean existsByUsername(String username);

    // VISTA USUARIOS
    Optional<User> findByUsername(String username);

    // ── Cast explícito a auth_app.user_role para PostgreSQL ──────────
    @Query(value = """
        SELECT * FROM auth_app.users u
        WHERE (
            :search IS NULL OR :search = ''
            OR LOWER(u.full_name)  LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(u.email)      LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(u.username)   LIKE LOWER(CONCAT('%', :search, '%'))
        )
        AND (:role IS NULL OR :role = '' OR u.role = CAST(:role AS auth_app.user_role))
        AND (:isActive IS NULL OR u.is_active = :isActive)
        ORDER BY u.created_at DESC
        """,
        countQuery = """
        SELECT COUNT(*) FROM auth_app.users u
        WHERE (
            :search IS NULL OR :search = ''
            OR LOWER(u.full_name)  LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(u.email)      LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(u.username)   LIKE LOWER(CONCAT('%', :search, '%'))
        )
        AND (:role IS NULL OR :role = '' OR u.role = CAST(:role AS auth_app.user_role))
        AND (:isActive IS NULL OR u.is_active = :isActive)
        """,
        nativeQuery = true)
    Page<User> findAllWithFilters(
            @Param("search")   String search,
            @Param("role")     String role,      // ← String, no UserRole
            @Param("isActive") Boolean isActive,
            Pageable pageable
    );

    //Vista perfil

    // Validar si el username ya existe en otro usuario diferente al actual
    boolean existsByUsernameAndIdNot(String username, UUID id);

    // Validar si el email ya existe en otro usuario diferente al actual
    boolean existsByEmailAndIdNot(String email, UUID id);
}