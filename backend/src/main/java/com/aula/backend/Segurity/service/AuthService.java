package com.aula.backend.Segurity.service;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

import com.aula.backend.dtos.LoginRequest;
import com.aula.backend.dtos.LoginResponse;
import com.aula.backend.model.User;
import com.aula.backend.repository.UserRepository;
import com.aula.backend.security.JwtUtil;

import org.springframework.security.core.AuthenticationException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final AuthenticationManager authManager;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    public LoginResponse login(LoginRequest request) {
        try {
            authManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    request.getEmail(),
                    request.getPassword()
                )
            );
        } catch (AuthenticationException e) {
         
            throw new BadCredentialsException("Email o contraseña incorrectos");
        }

        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new BadCredentialsException("Usuario no encontrado"));

        if (!user.getActive()) {
            throw new DisabledException("Cuenta desactivada");
        }
        if (user.getAccountLocked()) {
            throw new LockedException("Cuenta bloqueada. Intenta más tarde");
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());

        return LoginResponse.builder()
            .accessToken(token)
            .tokenType("Bearer")
            .role(user.getRole().name())
            .email(user.getEmail())
            .fullName(user.getFullName())
            .build();
    }
}