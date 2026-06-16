package com.aula.backend.exception;

import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, String>> handleBadCredentials(BadCredentialsException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(LockedException.class)
    public ResponseEntity<Map<String, String>> handleLocked(LockedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<Map<String, String>> handleDisabled(DisabledException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException e) {
        Map<String, String> errors = e.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(
                fe -> fe.getField(),
                fe -> fe.getDefaultMessage()
            ));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }
}
