
```
backend
├─ .mvn
│  └─ wrapper
│     └─ maven-wrapper.properties
├─ mvnw
├─ mvnw.cmd
├─ pom.xml
└─ src
   ├─ main
   │  ├─ java
   │  │  └─ com
   │  │     └─ aula
   │  │        └─ backend
   │  │           ├─ BackendApplication.java
   │  │           ├─ config
   │  │           │  ├─ JwtConfig.java
   │  │           │  └─ SecurityConfig.java
   │  │           ├─ controllers
   │  │           │  ├─ AuthController.java
   │  │           │  ├─ CursoController.java
   │  │           │  ├─ EstudianteController.java
   │  │           │  ├─ EvaluacionController.java
   │  │           │  ├─ LimpiezaController.java
   │  │           │  ├─ ProfileController.java
   │  │           │  ├─ PublicacionController.java
   │  │           │  └─ UserController.java
   │  │           ├─ dtos
   │  │           │  ├─ CursoDto.java
   │  │           │  ├─ CursoInicioDto.java
   │  │           │  ├─ EntregaDto.java
   │  │           │  ├─ EstudianteDto.java
   │  │           │  ├─ EvaluacionDto.java
   │  │           │  ├─ LimpiezaDto.java
   │  │           │  ├─ LoginRequest.java
   │  │           │  ├─ LoginResponse.java
   │  │           │  ├─ PortadaDto.java
   │  │           │  ├─ PublicacionDto.java
   │  │           │  ├─ RegisterRequest.java
   │  │           │  └─ UserDto.java
   │  │           ├─ enums
   │  │           │  ├─ AsistenciaEstado.java
   │  │           │  ├─ PublicacionTipo.java
   │  │           │  └─ UserRole.java
   │  │           ├─ exception
   │  │           │  ├─ AuthException.java
   │  │           │  └─ GlobalExceptionHandler.java
   │  │           ├─ model
   │  │           │  ├─ Asistencia.java
   │  │           │  ├─ Clase.java
   │  │           │  ├─ Curso.java
   │  │           │  ├─ CursoPortada.java
   │  │           │  ├─ DocenteCurso.java
   │  │           │  ├─ EntregaEstudiante.java
   │  │           │  ├─ Matricula.java
   │  │           │  ├─ Nota.java
   │  │           │  ├─ Publicacion.java
   │  │           │  └─ User.java
   │  │           ├─ repository
   │  │           │  ├─ AsistenciaRepository.java
   │  │           │  ├─ ClaseRepository.java
   │  │           │  ├─ CursoPortadaRepository.java
   │  │           │  ├─ CursoRepository.java
   │  │           │  ├─ DocenteCursoRepository.java
   │  │           │  ├─ EntregaEstudianteRepository.java
   │  │           │  ├─ MatriculaRepository.java
   │  │           │  ├─ NotaRepository.java
   │  │           │  ├─ PublicacionRepository.java
   │  │           │  └─ UserRepository.java
   │  │           ├─ security
   │  │           │  ├─ JwtAuthFilter.java
   │  │           │  ├─ JwtUtil.java
   │  │           │  └─ UserDetailsServiceImpl.java
   │  │           ├─ Segurity
   │  │           │  └─ service
   │  │           │     └─ AuthService.java
   │  │           └─ service
   │  │              ├─ CursoService.java
   │  │              ├─ EstudianteService.java
   │  │              ├─ EvaluacionService.java
   │  │              ├─ LimpiezaService.java
   │  │              ├─ PublicacionService.java
   │  │              └─ UserService.java
   │  └─ resources
   │     ├─ application.properties
   │     ├─ static
   │     └─ templates
   └─ test
      └─ java
         └─ com
            └─ aula
               └─ backend
                  ├─ BackendApplicationTests.java
                  └─ service
                     └─ CursoServiceTest.java

```