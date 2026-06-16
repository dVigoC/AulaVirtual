package com.aula.backend.config;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.cors.*;

import com.aula.backend.security.JwtAuthFilter;

@Configuration
@EnableMethodSecurity 
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    // 1. CORREGIDO: Agregamos tu URL de Vercel al final de la lista de permitidos
    @Value("${app.cors.origins:http://localhost:8081,http://localhost:8080,http://localhost:5173,http://localhost:19006,https://frontend-aula-virid.vercel.app/}")
    private List<String> allowedOrigins;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfig()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                // 2. CORREGIDO: Agregamos "/auth/**" porque tu frontend llama a /auth/login sin el prefijo /api
                .requestMatchers("/", "/api", "/api/auth/**", "/auth/**", "/error").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/docente/**").hasRole("DOCENTE")
                .requestMatchers("/api/estudiantes/**").hasAnyRole("ADMIN", "DOCENTE")
                .requestMatchers("/api/inicio/**").authenticated()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    @Bean
    public CorsConfigurationSource corsConfig() {
        CorsConfiguration config = new CorsConfiguration();
        
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        
        // 3. CORREGIDO: Usamos "*" en las cabeceras para evitar que falte alguna nativa de Expo/Axios
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setExposedHeaders(List.of("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}