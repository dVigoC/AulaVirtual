package com.aula.backend.controllers;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.aula.backend.dtos.UserDto;
import com.aula.backend.service.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/users")
@CrossOrigin(origins = "*", allowedHeaders = "*")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;

    // GET /api/admin/users?search=&role=&isActive=&page=0&size=10
    @GetMapping
    public ResponseEntity<UserDto.PageResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(userService.findAll(search, role, isActive, page, size));
    }

    // GET /api/admin/users/{id}
    @GetMapping("/{id}")
    public ResponseEntity<UserDto.Response> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.findById(id));
    }

    // POST /api/admin/users
    @PostMapping
    public ResponseEntity<UserDto.Response> create(
            @Valid @RequestBody UserDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(req));
    }

    // PUT /api/admin/users/{id}
    @PutMapping("/{id}")
    public ResponseEntity<UserDto.Response> update(
            @PathVariable UUID id,
            @Valid @RequestBody UserDto.UpdateRequest req) {
        return ResponseEntity.ok(userService.update(id, req));
    }

    // PATCH /api/admin/users/{id}/status
    @PatchMapping("/{id}/status")
    public ResponseEntity<UserDto.Response> setStatus(
            @PathVariable UUID id,@RequestParam boolean isActive) {
        return ResponseEntity.ok(userService.setActive(id, isActive));
    }

    // PATCH /api/admin/users/{id}/unlock
    @PatchMapping("/{id}/unlock")
    public ResponseEntity<UserDto.Response> unlock(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.unlock(id));
    }

    // PATCH /api/admin/users/{id}/password
    @PatchMapping("/{id}/password")
    public ResponseEntity<Void> resetPassword(
            @PathVariable UUID id,
            @Valid @RequestBody UserDto.PasswordRequest req) {
        userService.resetPassword(id, req);
        return ResponseEntity.noContent().build();
    }

    // DELETE /api/admin/users/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
