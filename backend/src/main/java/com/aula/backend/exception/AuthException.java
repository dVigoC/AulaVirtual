package com.aula.backend.exception;

import org.springframework.http.HttpStatus;

public class AuthException extends RuntimeException {

    private final HttpStatus status;

    // Constructor que acepta solo el mensaje (por defecto usa BAD_REQUEST o INTERNAL_SERVER_ERROR)
    public AuthException(String message) {
        super(message);
        this.status = HttpStatus.BAD_REQUEST; 
    }

    // Constructor que acepta mensaje y un código de estado HTTP
    public AuthException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}