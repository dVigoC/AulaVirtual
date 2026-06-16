package com.aula.backend.model;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.aula.backend.enums.UserRole;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "Users", schema = "auth_app")
public class User implements UserDetails {

    @Id
    @GeneratedValue // Hibernate detecta automáticamente el generador óptimo para UUID
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", length = 150)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "auth_app.user_role")
    private UserRole role;

    @Column(name = "is_active", nullable = false)
    private Boolean active = true;

    @Column(name = "email_verified", nullable = false)
    private Boolean emailVerified = false;

    @Column(name = "account_locked", nullable = false)
    private Boolean accountLocked = false;

    @Column(name = "account_locked_until")
    private OffsetDateTime accountLockedUntil;

    @Column(name = "failed_login_attempts", nullable = false)
    private Short failedLoginAttempts = 0;

    @Column(name = "last_failed_login")
    private OffsetDateTime lastFailedLogin;

    @Column(name = "last_login_at")
    private OffsetDateTime lastLoginAt;

    // ── SOLUCIÓN CORREGIDA PARA INET ──────────────────────────────────
    @Column(name = "last_login_ip", columnDefinition = "inet")
    @org.hibernate.annotations.ColumnTransformer(
    write = "?::inet")// <--- Esto fuerza a Postgres a castear el String a inet al hacer INSERT/UPDATE
    private String lastLoginIp;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    // ── AUDITORÍA AUTOMÁTICA DE FECHAS ──────────────────────────────
    @PrePersist
    protected void onCreate() {
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + this.role.name().toUpperCase()));
    }

    @Override
    public String getPassword() {
        return this.passwordHash; // Le dices a Spring dónde está tu contraseña
    }

    @Override
    public String getUsername() {
        return this.email; // Le dices a Spring que tu "username" real es el email
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !this.accountLocked; // Conectas el campo de tu BD con Spring Security
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return this.active; // Conectas tu campo active con Spring Security
    }
}