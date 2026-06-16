package com.aula.backend.service;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.aula.backend.dtos.UserDto;
import com.aula.backend.enums.UserRole;
import com.aula.backend.model.User;
import com.aula.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {
       private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // ── Listar con filtros y paginación ─────────────────────────────
    public UserDto.PageResponse findAll(String search, String role,
                                     Boolean isActive, int page, int size) {
        // Validar que el rol sea un valor válido si viene en el request
        String roleParam = null;
        if (role != null && !role.isBlank()) {
            try {
                UserRole.valueOf(role.toUpperCase()); // valida que exista
                roleParam = role.toUpperCase();       // lo pasamos como String
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Rol inválido: " + role);
            }
        }

        Page<User> result = userRepository.findAllWithFilters(
                search, roleParam, isActive, PageRequest.of(page, size));

        UserDto.PageResponse response = new UserDto.PageResponse();
        response.setContent(result.getContent().stream().map(this::toResponse).toList());
        response.setPage(result.getNumber());
        response.setSize(result.getSize());
        response.setTotalElements(result.getTotalElements());
        response.setTotalPages(result.getTotalPages());
        return response;
    }

    // ── Obtener por ID ──────────────────────────────────────────────
    public UserDto.Response findById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return toResponse(user);
    }

    // ── Crear usuario ───────────────────────────────────────────────
    @Transactional
    public UserDto.Response create(UserDto.CreateRequest req) {
        if (userRepository.existsByEmail(req.getEmail()))
            throw new RuntimeException("El email ya está registrado");
        if (userRepository.existsByUsername(req.getUsername()))
            throw new RuntimeException("El username ya está en uso");

        User user = new User();
        user.setUsername(req.getUsername().toLowerCase());
        user.setEmail(req.getEmail().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setFullName(req.getFullName());
        user.setRole(req.getRole());
        user.setActive(true);
        user.setEmailVerified(true);   // Admin crea verificado directamente
        user.setAccountLocked(false);
        user.setCreatedAt(OffsetDateTime.now());
        user.setUpdatedAt(OffsetDateTime.now());

        return toResponse(userRepository.save(user));
    }

    // ── Actualizar datos básicos ─────────────────────────────────────
    @Transactional
    public UserDto.Response update(UUID id, UserDto.UpdateRequest req) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (req.getUsername() != null && !req.getUsername().equals(user.getUsername())) {
            if (userRepository.existsByUsername(req.getUsername()))
                throw new RuntimeException("El username ya está en uso");
            user.setUsername(req.getUsername().toLowerCase());
        }
        if (req.getEmail() != null && !req.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(req.getEmail()))
                throw new RuntimeException("El email ya está registrado");
            user.setEmail(req.getEmail().toLowerCase());
        }
        if (req.getFullName() != null) user.setFullName(req.getFullName());
        if (req.getRole()     != null) user.setRole(req.getRole());

        user.setUpdatedAt(OffsetDateTime.now());
        return toResponse(userRepository.save(user));
    }

    // ── Activar / desactivar ─────────────────────────────────────────
    @Transactional
    public UserDto.Response setActive(UUID id, boolean isActive) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        user.setActive(isActive);
        user.setUpdatedAt(OffsetDateTime.now());
        return toResponse(userRepository.save(user));
    }

    // ── Desbloquear cuenta ───────────────────────────────────────────
    @Transactional
    public UserDto.Response unlock(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        user.setAccountLocked(false);
        user.setAccountLockedUntil(null);
        user.setFailedLoginAttempts((short) 0);
        user.setUpdatedAt(OffsetDateTime.now());
        return toResponse(userRepository.save(user));
    }

    // ── Reset de contraseña por admin ────────────────────────────────
    @Transactional
    public void resetPassword(UUID id, UserDto.PasswordRequest req) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        user.setUpdatedAt(OffsetDateTime.now());
        userRepository.save(user);
    }

    // ── Eliminar ─────────────────────────────────────────────────────
    @Transactional
    public void delete(UUID id) {
        if (!userRepository.existsById(id))
            throw new RuntimeException("Usuario no encontrado");
        userRepository.deleteById(id);
    }

    // ── Mapper interno ───────────────────────────────────────────────
    private UserDto.Response toResponse(User user) {
        UserDto.Response r = new UserDto.Response();
        r.setId(user.getId());
        r.setUsername(user.getUsername());
        r.setEmail(user.getEmail());
        r.setFullName(user.getFullName());
        r.setRole(user.getRole());
        r.setActive(user.getActive());
        r.setEmailVerified(user.getEmailVerified());
        r.setAccountLocked(user.getAccountLocked());
        r.setCreatedAt(user.getCreatedAt());
        r.setLastLoginAt(user.getLastLoginAt());
        return r;
    }
}
