package com.aula.backend.controllers;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.aula.backend.model.User;
import com.aula.backend.repository.UserRepository;
import com.aula.backend.dtos.UserDto;

@RestController
@RequestMapping("/api/profile")
@CrossOrigin(origins = "*", allowedHeaders = "*")
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // ── OBTENER PERFIL DEL USUARIO AUTENTICADO ───────────────────────────────
    @GetMapping
    public ResponseEntity<UserDto.Response> getProfile(Authentication authentication) {
        String email = authentication.getName(); // Extrae el email desde el token JWT
        
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Perfil no encontrado"));
        
        return ResponseEntity.ok(convertToResponseDto(user));
    }

    // ── ACTUALIZAR DATOS BÁSICOS DEL PERFIL ──────────────────────────────────
    @PutMapping
    public ResponseEntity<UserDto.Response> updateProfile(
            Authentication authentication,
            @Valid @RequestBody UserDto.UpdateRequest req) {
        
        String currentEmail = authentication.getName();
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        // Validar que el nuevo username no lo tenga otra cuenta
        if (req.getUsername() != null && userRepository.existsByUsernameAndIdNot(req.getUsername().toLowerCase(), user.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre de usuario ya está registrado");
        }
        
        // Validar que el nuevo email no cause colisión con otra cuenta
        if (req.getEmail() != null && userRepository.existsByEmailAndIdNot(req.getEmail(), user.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El email ya se encuentra en uso");
        }

        // Modificar solo campos permitidos para el propio usuario (el rol NO se cambia aquí)
        if (req.getUsername() != null) user.setUsername(req.getUsername().toLowerCase());
        if (req.getEmail() != null) user.setEmail(req.getEmail());
        if (req.getFullName() != null) user.setFullName(req.getFullName());

        User updatedUser = userRepository.save(user);
        return ResponseEntity.ok(convertToResponseDto(updatedUser));
    }

    // ── CAMBIAR SU PROPIA CONTRASEÑA ─────────────────────────────────────────
    @PatchMapping("/password")
    public ResponseEntity<Void> updatePassword(
            Authentication authentication,
            @Valid @RequestBody UserDto.PasswordRequest req) {
        
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        // Ajustado a req.getNewPassword() según tu DTO
        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);

        return ResponseEntity.noContent().build();
    }

    // ── HELPER MANUAL DE MAPEADO (ENTIDAD -> DTO.RESPONSE) ───────────────────
    private UserDto.Response convertToResponseDto(User user) {
        UserDto.Response response = new UserDto.Response();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setFullName(user.getFullName());
        response.setRole(user.getRole());
        response.setActive(user.getActive()); // Ajusta si en tu entidad uses getIsActive()
        response.setEmailVerified(user.getEmailVerified());
        response.setAccountLocked(user.getAccountLocked());
        response.setCreatedAt(user.getCreatedAt());
        response.setLastLoginAt(user.getLastLoginAt());
        return response;
    }
}