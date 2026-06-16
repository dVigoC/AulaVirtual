package com.aula.backend.dtos;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponse {
    
     private String accessToken;
    private String tokenType;     // "Bearer"
    private String role;
    private String email;
    private String fullName;
}
