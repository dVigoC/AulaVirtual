package com.aula.backend.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.aula.backend.model.User;
import com.aula.backend.repository.UserRepository;



@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        try {
            if (jwtUtil.isTokenValid(token)) {
                String email = jwtUtil.extractEmail(token);

                User user = userRepository.findByEmail(email).orElse(null);

                if (user == null || !user.getActive() || user.getAccountLocked()) {
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Usuario no disponible.");
                    return;
                }

                // El principal ahora ES tu User, no el de Spring Security
                UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(
                        user, // ← principal es tu User directamente
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
                    );
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        } catch (Exception e) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token inválido o expirado.");
            return;
        }

        filterChain.doFilter(request, response);
    }
}