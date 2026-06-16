package com.aula.backend.security;

import java.util.List;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.aula.backend.model.User;
import com.aula.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + email));

        // Spring Security necesita el rol con prefijo ROLE_
        return new org.springframework.security.core.userdetails.User(
            user.getEmail(),
            user.getPasswordHash(),
            user.getActive(),
            true,
            true,
            !user.getAccountLocked(),
            List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
}
