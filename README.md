# 🎓 AulaVirtual

Proyecto integral de gestión educativa desarrollado con **Spring Boot** (Backend) y **Expo/React Native** (Frontend).

---

## 🛠️ Requisitos previos
- Java 17+
- Node.js (versión LTS recomendada)
- [Supabase](https://supabase.com/) cuenta activa
- Expo CLI

---

## ⚙️ Configuración del Entorno

Para que el proyecto funcione, debes configurar los archivos de variables de entorno. 

### 1. Frontend (Expo):
```.env:
# API Backend
EXPO_PUBLIC_API_URL=http://localhost:8080/api

# Supabase (Anon Key es segura para el cliente)
EXPO_PUBLIC_SUPABASE_URL=<TU_URL_DE_SUPABASE>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<TU_SUPABASE_ANON_KEY>
```

### 2. Backend (Spring Boot)
Ubícate en `backend/src/main/resources/` y crea un archivo llamado `application.properties`. Puedes usar el siguiente esquema:

```properties
# --- Base de Datos (Supabase PostgreSQL) ---
spring.datasource.url=jdbc:postgresql://<TU_URL_DE_SUPABASE>:5432/postgres?sslmode=require
spring.datasource.username=postgres.<TU_USERNAME>
spring.datasource.password=<TU_CONTRASEÑA>
spring.datasource.driver-class-name=org.postgresql.Driver

# --- HikariCP ---
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.maximum-pool-size=5

# --- JPA ---
spring.jpa.hibernate.ddl-auto=none
spring.jpa.properties.hibernate.default_schema=auth_app
spring.jpa.show-sql=true

# --- JWT ---
# Recomendación: Genera una clave segura de al menos 32 caracteres
jwt.secret=<TU_CLAVE_SECRETA_JWT>
jwt.expiration-ms=900000

# --- Supabase Config ---
supabase.url=<TU_URL_DE_SUPABASE>
# IMPORTANTE: El service-role-key tiene privilegios de administrador. No lo expongas.
supabase.service-role-key=<TU_SUPABASE_SERVICE_ROLE_KEY>

server.port=8080

