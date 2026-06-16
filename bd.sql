CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS auth_app;

-- ============================================================
-- 1. ENUM: roles (solo nomenclatura, lógica en Spring Security)
-- ============================================================
CREATE TYPE auth_app.user_role AS ENUM (
    'ADMIN',
    'DOCENTE',
    'ESTUDIANTE'
);

-- ============================================================
-- 2. TABLA: users
--
--  Validaciones en BD:
--    · email: formato válido, único, no nulo
--    · username: 3–50 chars, solo a-z 0-9 _ . único
--    · password_hash: no nulo, mínimo 60 chars (BCrypt siempre >= 60)
--    · failed_login_attempts: entre 0 y 10
--    · role: solo valores del ENUM
-- ============================================================
CREATE TABLE auth_app.users (
    id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),

    username              VARCHAR(50)   NOT NULL,
    email                 VARCHAR(255)  NOT NULL,
    password_hash         VARCHAR(255)  NOT NULL,
    full_name             VARCHAR(150),
    role                  auth_app.user_role NOT NULL DEFAULT 'ESTUDIANTE',

    -- Estado de cuenta
    is_active             BOOLEAN       NOT NULL DEFAULT TRUE,
    email_verified        BOOLEAN       NOT NULL DEFAULT FALSE,
    account_locked        BOOLEAN       NOT NULL DEFAULT FALSE,
    account_locked_until  TIMESTAMPTZ,

    -- Control de intentos fallidos
    failed_login_attempts SMALLINT      NOT NULL DEFAULT 0,
    last_failed_login     TIMESTAMPTZ,

    -- Auditoría de sesión
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    last_login_at         TIMESTAMPTZ,
    last_login_ip         INET,

    -- ── Validaciones de integridad ────────────────────────────
    CONSTRAINT uq_users_email
        UNIQUE (email),

    CONSTRAINT uq_users_username
        UNIQUE (username),

    CONSTRAINT chk_email_format
        CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'),

    CONSTRAINT chk_email_length
        CHECK (char_length(email) <= 255),

    CONSTRAINT chk_username_length
        CHECK (char_length(username) >= 3 AND char_length(username) <= 50),

    CONSTRAINT chk_username_chars
        CHECK (username ~* '^[a-z0-9_\.]+$'),

    CONSTRAINT chk_password_hash_length
        CHECK (char_length(password_hash) >= 60),   -- BCrypt siempre produce >= 60 chars

    CONSTRAINT chk_full_name_length
        CHECK (full_name IS NULL OR char_length(full_name) <= 150),

    CONSTRAINT chk_failed_attempts_range
        CHECK (failed_login_attempts >= 0 AND failed_login_attempts <= 10),

    CONSTRAINT chk_locked_consistency
        CHECK (
            (account_locked = FALSE AND account_locked_until IS NULL)
            OR
            (account_locked = TRUE)
        )
);

COMMENT ON TABLE  auth_app.users IS 'Usuarios del sistema. La lógica de autorización por rol vive en Spring Security.';
COMMENT ON COLUMN auth_app.users.password_hash         IS 'BCrypt $2a$12$ generado por Spring. Nunca texto plano.';
COMMENT ON COLUMN auth_app.users.role                  IS 'Solo nomenclatura. Verificación de permisos en Spring Security.';
COMMENT ON COLUMN auth_app.users.account_locked_until  IS 'Desbloqueo automático por tiempo. NULL = no bloqueado.';
COMMENT ON COLUMN auth_app.users.failed_login_attempts IS 'Gestionado por Spring; BD solo valida rango 0–10.';

-- ============================================================
-- 3. TABLA: refresh_tokens
--
--  Validaciones en BD:
--    · token_hash: único, no nulo
--    · expires_at: obligatorio, debe ser futuro al insertar
--    · family_id: no nulo (para detección de robo en Spring)
-- ============================================================
CREATE TABLE auth_app.refresh_tokens (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID         NOT NULL
                              REFERENCES auth_app.users(id) ON DELETE CASCADE,
    token_hash   VARCHAR(255) NOT NULL,
    family_id    UUID         NOT NULL DEFAULT uuid_generate_v4(),
    is_revoked   BOOLEAN      NOT NULL DEFAULT FALSE,
    device_info  VARCHAR(255),
    ip_address   INET,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ  NOT NULL,

    CONSTRAINT uq_refresh_token_hash
        UNIQUE (token_hash),

    CONSTRAINT chk_token_hash_length
        CHECK (char_length(token_hash) >= 64),      -- SHA-256 en hex = 64 chars mínimo

    CONSTRAINT chk_expires_after_created
        CHECK (expires_at > created_at)
);

COMMENT ON COLUMN auth_app.refresh_tokens.token_hash IS 'SHA-256 del token real en hex. Nunca el token en claro.';
COMMENT ON COLUMN auth_app.refresh_tokens.family_id  IS 'Spring detecta reuso de tokens revocados y revoca toda la familia.';

-- ============================================================
-- 4. TABLA: email_verification_tokens
--
--  Validaciones en BD:
--    · token_hash: único, no nulo, mínimo 64 chars
--    · expires_at: debe ser posterior a created_at
-- ============================================================
CREATE TABLE auth_app.email_verification_tokens (
    id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID         NOT NULL
               REFERENCES auth_app.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    is_used    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),

    CONSTRAINT uq_email_verif_token
        UNIQUE (token_hash),

    CONSTRAINT chk_email_verif_hash_length
        CHECK (char_length(token_hash) >= 64),

    CONSTRAINT chk_email_verif_expiry
        CHECK (expires_at > created_at)
);

-- ============================================================
-- 5. TABLA: password_reset_tokens
--
--  Validaciones en BD:
--    · Igual que email_verification_tokens
--    · expires_at por defecto: 1 hora
-- ============================================================
CREATE TABLE auth_app.password_reset_tokens (
    id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID         NOT NULL
               REFERENCES auth_app.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    is_used    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),

    CONSTRAINT uq_password_reset_token
        UNIQUE (token_hash),

    CONSTRAINT chk_pwd_reset_hash_length
        CHECK (char_length(token_hash) >= 64),

    CONSTRAINT chk_pwd_reset_expiry
        CHECK (expires_at > created_at)
);

-- ============================================================
-- 6. TABLA: audit_log  (solo INSERT — registro inmutable)
--
--  Validaciones en BD:
--    · event_type: no nulo, solo valores conocidos
--    · created_at: no puede ser futuro
-- ============================================================
CREATE TABLE auth_app.audit_log (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID         REFERENCES auth_app.users(id) ON DELETE SET NULL,
    event_type  VARCHAR(50)  NOT NULL,
    ip_address  INET,
    user_agent  TEXT,
    details     JSONB,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_event_type_valid
        CHECK (event_type IN (
            'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT',
            'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED',
            'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED',
            'EMAIL_VERIFIED', 'TOKEN_REFRESHED', 'TOKEN_REVOKED',
            'REGISTER_SUCCESS'
        )),

    CONSTRAINT chk_audit_not_future
        CHECK (created_at <= NOW() + INTERVAL '5 seconds')  -- margen mínimo por latencia
);

COMMENT ON TABLE auth_app.audit_log IS 'Inmutable: solo INSERT. La lógica de qué registrar vive en Spring.';

-- ============================================================
-- 7. ÍNDICES
-- ============================================================
CREATE INDEX idx_users_email       ON auth_app.users(email);
CREATE INDEX idx_users_username    ON auth_app.users(username);
CREATE INDEX idx_users_role        ON auth_app.users(role);
CREATE INDEX idx_users_active      ON auth_app.users(is_active)      WHERE is_active = TRUE;
CREATE INDEX idx_users_locked      ON auth_app.users(account_locked) WHERE account_locked = TRUE;

CREATE INDEX idx_refresh_user      ON auth_app.refresh_tokens(user_id);
CREATE INDEX idx_refresh_family    ON auth_app.refresh_tokens(family_id);
CREATE INDEX idx_refresh_expiry    ON auth_app.refresh_tokens(expires_at) WHERE is_revoked = FALSE;

CREATE INDEX idx_audit_user        ON auth_app.audit_log(user_id);
CREATE INDEX idx_audit_event       ON auth_app.audit_log(event_type);
CREATE INDEX idx_audit_created     ON auth_app.audit_log(created_at DESC);

-- ============================================================
-- 8. TRIGGER: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION auth_app.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON auth_app.users
    FOR EACH ROW EXECUTE FUNCTION auth_app.set_updated_at();

-- ============================================================
-- 9. FUNCIÓN: registrar intento fallido + bloqueo progresivo
--    Spring llama a esta función; BD aplica el cambio y valida.
--      5 intentos → 15 minutos
--      8 intentos → 1 hora
--     10 intentos → 24 horas
-- ============================================================
CREATE OR REPLACE FUNCTION auth_app.handle_failed_login(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_attempts SMALLINT;
BEGIN
    UPDATE auth_app.users
    SET
        failed_login_attempts = failed_login_attempts + 1,
        last_failed_login     = NOW()
    WHERE id = p_user_id
    RETURNING failed_login_attempts INTO v_attempts;

    IF v_attempts >= 10 THEN
        UPDATE auth_app.users
        SET account_locked = TRUE, account_locked_until = NOW() + INTERVAL '24 hours'
        WHERE id = p_user_id;
    ELSIF v_attempts >= 8 THEN
        UPDATE auth_app.users
        SET account_locked = TRUE, account_locked_until = NOW() + INTERVAL '1 hour'
        WHERE id = p_user_id;
    ELSIF v_attempts >= 5 THEN
        UPDATE auth_app.users
        SET account_locked = TRUE, account_locked_until = NOW() + INTERVAL '15 minutes'
        WHERE id = p_user_id;
    END IF;
END;
$$;

-- ============================================================
-- 10. FUNCIÓN: resetear intentos tras login exitoso
-- ============================================================
CREATE OR REPLACE FUNCTION auth_app.reset_failed_attempts(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    UPDATE auth_app.users
    SET
        failed_login_attempts = 0,
        account_locked        = FALSE,
        account_locked_until  = NULL,
        last_login_at         = NOW()
    WHERE id = p_user_id;
END;
$$;

-- ============================================================
-- 11. FUNCIÓN: revocar toda una familia de tokens
--     Spring la llama al detectar reuso de token revocado.
-- ============================================================
CREATE OR REPLACE FUNCTION auth_app.revoke_token_family(p_family_id UUID)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE auth_app.refresh_tokens
    SET is_revoked = TRUE
    WHERE family_id = p_family_id AND is_revoked = FALSE;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- ============================================================
-- 12. FUNCIÓN: limpieza de tokens expirados (cron diario)
-- ============================================================
CREATE OR REPLACE FUNCTION auth_app.cleanup_expired_tokens()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
    v_total INTEGER := 0;
    v_part  INTEGER;
BEGIN
    DELETE FROM auth_app.refresh_tokens
        WHERE expires_at < NOW() OR is_revoked = TRUE;
    GET DIAGNOSTICS v_part = ROW_COUNT; v_total := v_total + v_part;

    DELETE FROM auth_app.email_verification_tokens
        WHERE expires_at < NOW() OR is_used = TRUE;
    GET DIAGNOSTICS v_part = ROW_COUNT; v_total := v_total + v_part;

    DELETE FROM auth_app.password_reset_tokens
        WHERE expires_at < NOW() OR is_used = TRUE;
    GET DIAGNOSTICS v_part = ROW_COUNT; v_total := v_total + v_part;

    RETURN v_total;
END;
$$;

-- ============================================================
-- 13. ROL DE BD con privilegios mínimos
--     Spring se conecta con este usuario, nunca con postgres
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'springboot_app') THEN
        CREATE ROLE springboot_app WITH LOGIN PASSWORD 'CHANGE_THIS_IN_ENV_FILE';
    END IF;
END $$;

GRANT USAGE  ON SCHEMA auth_app TO springboot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA auth_app TO springboot_app;
GRANT EXECUTE                        ON ALL FUNCTIONS IN SCHEMA auth_app TO springboot_app;
-- Sin DDL: no puede DROP, ALTER, CREATE

-- ============================================================
-- 14. ROW LEVEL SECURITY  (Supabase)
--     Spring usa service_role key → bypass automático de RLS.
--     Solo protege accesos directos no autorizados.
-- ============================================================
ALTER TABLE auth_app.users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_app.refresh_tokens           ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_app.email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_app.password_reset_tokens    ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_app.audit_log                ENABLE ROW LEVEL SECURITY;

-- Bloquear acceso directo a todas las tablas desde cliente anon
CREATE POLICY rls_block_anon_users
    ON auth_app.users FOR ALL USING (FALSE);

CREATE POLICY rls_block_anon_refresh
    ON auth_app.refresh_tokens FOR ALL USING (FALSE);

CREATE POLICY rls_block_anon_email_verif
    ON auth_app.email_verification_tokens FOR ALL USING (FALSE);

CREATE POLICY rls_block_anon_pwd_reset
    ON auth_app.password_reset_tokens FOR ALL USING (FALSE);

CREATE POLICY rls_block_anon_audit
    ON auth_app.audit_log FOR ALL USING (FALSE);

-- ============================================================

-- ============================================================
--  MÓDULO CURSOS — Pegar directo en Supabase SQL Editor
--  Esquema: auth_app (el mismo que ya tienes)
-- ============================================================

-- ============================================================
-- 1. TABLA: cursos
-- ============================================================
CREATE TABLE auth_app.cursos (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo      VARCHAR(20) NOT NULL,
    nombre      VARCHAR(150) NOT NULL,
    descripcion TEXT,
    creditos    SMALLINT    NOT NULL DEFAULT 0,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_cursos_codigo
        UNIQUE (codigo),

    CONSTRAINT chk_cursos_codigo_length
        CHECK (char_length(codigo) >= 2),

    CONSTRAINT chk_cursos_nombre_length
        CHECK (char_length(nombre) >= 2 AND char_length(nombre) <= 150),

    CONSTRAINT chk_cursos_creditos
        CHECK (creditos >= 0 AND creditos <= 20)
);

COMMENT ON TABLE  auth_app.cursos IS 'Catálogo de cursos del sistema educativo.';
COMMENT ON COLUMN auth_app.cursos.codigo IS 'Código único del curso (ej: BIB-101).';

-- ============================================================
-- 2. TABLA: docente_cursos  (relación N:M  docente ↔ curso)
-- ============================================================
CREATE TABLE auth_app.docente_cursos (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    docente_id   UUID        NOT NULL REFERENCES auth_app.users(id) ON DELETE CASCADE,
    curso_id     UUID        NOT NULL REFERENCES auth_app.cursos(id) ON DELETE CASCADE,
    anio_periodo VARCHAR(10) NOT NULL, -- Ej: '2026-I', '2026-II'
    asignado_por UUID        REFERENCES auth_app.users(id) ON DELETE SET NULL,
    asignado_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,

    -- El "UNIQUE" ahora protege la combinación por cada año/ciclo específico
    CONSTRAINT uq_docente_curso_anio
        UNIQUE (docente_id, curso_id, anio_periodo)
);

COMMENT ON TABLE  auth_app.docente_cursos IS 'Asignación de cursos a docentes. Solo gestionable por ADMIN.';
COMMENT ON COLUMN auth_app.docente_cursos.asignado_por IS 'UUID del admin que realizó la asignación.';

-- ============================================================
-- 3. ÍNDICES
-- ============================================================
CREATE INDEX idx_cursos_active  ON auth_app.cursos(is_active)          WHERE is_active = TRUE;
CREATE INDEX idx_cursos_codigo  ON auth_app.cursos(codigo);

CREATE INDEX idx_dc_docente     ON auth_app.docente_cursos(docente_id);
CREATE INDEX idx_dc_curso       ON auth_app.docente_cursos(curso_id);
CREATE INDEX idx_dc_active      ON auth_app.docente_cursos(is_active)   WHERE is_active = TRUE;

-- ============================================================
-- 4. TRIGGER: updated_at automático en cursos
--    Reutiliza la función que ya tienes: auth_app.set_updated_at()
-- ============================================================
CREATE TRIGGER trg_cursos_updated_at
    BEFORE UPDATE ON auth_app.cursos
    FOR EACH ROW EXECUTE FUNCTION auth_app.set_updated_at();

-- ============================================================
-- 5. PERMISOS para springboot_app
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_app.cursos         TO springboot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_app.docente_cursos TO springboot_app;

-- ============================================================
-- 6. RLS — bloquear acceso directo anónimo (igual que el resto)
-- ============================================================
ALTER TABLE auth_app.cursos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_app.docente_cursos ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_block_anon_cursos
    ON auth_app.cursos FOR ALL USING (FALSE);

CREATE POLICY rls_block_anon_docente_cursos
    ON auth_app.docente_cursos FOR ALL USING (FALSE);

-- ============================================================
--  MÓDULO ESTUDIANTES + ASISTENCIAS
--  Esquema: auth_app (el mismo que ya tienes)
--  Pegar directo en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABLA: matriculas  (estudiante ↔ curso)
--    Un estudiante puede estar matriculado en varios cursos.
--    Un curso puede tener varios estudiantes.
-- ============================================================
CREATE TABLE auth_app.matriculas (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    estudiante_id   UUID        NOT NULL REFERENCES auth_app.users(id) ON DELETE CASCADE,
    curso_id        UUID        NOT NULL REFERENCES auth_app.cursos(id) ON DELETE CASCADE,
    anio_periodo    VARCHAR(10) NOT NULL,                     -- Ej: '2026-I'
    matriculado_por UUID        REFERENCES auth_app.users(id) ON DELETE SET NULL,
    matriculado_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,

    -- Un estudiante no puede estar matriculado dos veces en el mismo
    -- curso y periodo
    CONSTRAINT uq_matricula_estudiante_curso_periodo
        UNIQUE (estudiante_id, curso_id, anio_periodo),

    CONSTRAINT chk_matricula_periodo_length
        CHECK (char_length(anio_periodo) >= 4 AND char_length(anio_periodo) <= 10)
);

COMMENT ON TABLE  auth_app.matriculas IS 'Matrícula de estudiantes a cursos por periodo académico.';
COMMENT ON COLUMN auth_app.matriculas.anio_periodo    IS 'Ej: 2026-I, 2026-II';
COMMENT ON COLUMN auth_app.matriculas.matriculado_por IS 'UUID del admin que realizó la matrícula.';

-- ============================================================
-- 2. TABLA: clases
--    Representa una sesión/clase de un curso en una fecha dada.
--    El docente (o admin) crea la clase para luego tomar asistencia.
-- ============================================================
CREATE TABLE auth_app.clases (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    curso_id     UUID        NOT NULL REFERENCES auth_app.cursos(id) ON DELETE CASCADE,
    docente_id   UUID        REFERENCES auth_app.users(id) ON DELETE SET NULL,
    titulo       VARCHAR(200),                                -- Tema / título de la clase
    fecha        DATE        NOT NULL,
    hora_inicio  TIMESTAMPTZ,                                 -- Seteado al marcar inicio
    hora_fin     TIMESTAMPTZ,                                 -- Seteado al marcar fin
    anio_periodo VARCHAR(10) NOT NULL,
    creado_por   UUID        REFERENCES auth_app.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_clase_horas
        CHECK (hora_fin IS NULL OR hora_inicio IS NULL OR hora_fin > hora_inicio),

    CONSTRAINT chk_clase_periodo_length
        CHECK (char_length(anio_periodo) >= 4 AND char_length(anio_periodo) <= 10)
);

COMMENT ON TABLE  auth_app.clases IS 'Sesión de clase dentro de un curso. Permite registrar inicio y fin para calcular horas dictadas.';
COMMENT ON COLUMN auth_app.clases.hora_inicio IS 'Timestamp real de inicio de clase (se setea al "Marcar inicio").';
COMMENT ON COLUMN auth_app.clases.hora_fin    IS 'Timestamp real de fin de clase (se setea al "Marcar fin").';
COMMENT ON COLUMN auth_app.clases.titulo      IS 'Tema o título opcional de la sesión.';

-- ============================================================
-- 3. TABLA: asistencias
--    Registro de asistencia de UN estudiante a UNA clase.
--    estado: PRESENTE | TARDANZA | AUSENTE | JUSTIFICADO
-- ============================================================
CREATE TYPE auth_app.asistencia_estado AS ENUM (
    'PRESENTE',
    'TARDANZA',
    'AUSENTE',
    'JUSTIFICADO'
);

CREATE TABLE auth_app.asistencias (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    clase_id    UUID        NOT NULL REFERENCES auth_app.clases(id)  ON DELETE CASCADE,
    estudiante_id UUID      NOT NULL REFERENCES auth_app.users(id)   ON DELETE CASCADE,
    estado      auth_app.asistencia_estado NOT NULL DEFAULT 'AUSENTE',
    observacion TEXT,
    registrado_por UUID     REFERENCES auth_app.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Un registro por estudiante por clase
    CONSTRAINT uq_asistencia_clase_estudiante
        UNIQUE (clase_id, estudiante_id)
);

COMMENT ON TABLE  auth_app.asistencias IS 'Asistencia individual de cada estudiante a cada clase.';
COMMENT ON COLUMN auth_app.asistencias.estado        IS 'PRESENTE | TARDANZA | AUSENTE | JUSTIFICADO';
COMMENT ON COLUMN auth_app.asistencias.observacion   IS 'Observación opcional del docente.';
COMMENT ON COLUMN auth_app.asistencias.registrado_por IS 'Docente o admin que tomó la asistencia.';

-- ============================================================
-- 4. ÍNDICES
-- ============================================================

-- Matrículas
CREATE INDEX idx_mat_estudiante    ON auth_app.matriculas(estudiante_id);
CREATE INDEX idx_mat_curso         ON auth_app.matriculas(curso_id);
CREATE INDEX idx_mat_periodo       ON auth_app.matriculas(anio_periodo);
CREATE INDEX idx_mat_active        ON auth_app.matriculas(is_active) WHERE is_active = TRUE;

-- Clases
CREATE INDEX idx_clase_curso       ON auth_app.clases(curso_id);
CREATE INDEX idx_clase_docente     ON auth_app.clases(docente_id);
CREATE INDEX idx_clase_fecha       ON auth_app.clases(fecha DESC);
CREATE INDEX idx_clase_periodo     ON auth_app.clases(anio_periodo);

-- Asistencias
CREATE INDEX idx_asist_clase       ON auth_app.asistencias(clase_id);
CREATE INDEX idx_asist_estudiante  ON auth_app.asistencias(estudiante_id);
CREATE INDEX idx_asist_estado      ON auth_app.asistencias(estado);

-- ============================================================
-- 5. TRIGGER: updated_at automático en clases y asistencias
--    Reutiliza la función auth_app.set_updated_at() que ya tienes
-- ============================================================
CREATE TRIGGER trg_clases_updated_at
    BEFORE UPDATE ON auth_app.clases
    FOR EACH ROW EXECUTE FUNCTION auth_app.set_updated_at();

CREATE TRIGGER trg_asistencias_updated_at
    BEFORE UPDATE ON auth_app.asistencias
    FOR EACH ROW EXECUTE FUNCTION auth_app.set_updated_at();

-- ============================================================
-- 6. PERMISOS para springboot_app
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_app.matriculas  TO springboot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_app.clases      TO springboot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_app.asistencias TO springboot_app;

-- ============================================================
-- 7. RLS — bloquear acceso directo anónimo
-- ============================================================
ALTER TABLE auth_app.matriculas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_app.clases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_app.asistencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_block_anon_matriculas
    ON auth_app.matriculas  FOR ALL USING (FALSE);

CREATE POLICY rls_block_anon_clases
    ON auth_app.clases      FOR ALL USING (FALSE);

CREATE POLICY rls_block_anon_asistencias
    ON auth_app.asistencias FOR ALL USING (FALSE);

-- ============================================================
-- ============================================================
--  MÓDULO INICIO — Publicaciones del Aula Virtual
--  Esquema: auth_app
--  Pegar directo en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. ENUM: tipo de publicación
-- ============================================================
CREATE TYPE auth_app.publicacion_tipo AS ENUM (
    'CLASE_VIRTUAL',
    'TAREA',
    'MATERIAL_CLASE',
    'EVALUACION',
    'ANUNCIO_GENERAL',
    'CONTENIDO_INMEDIATO'
);

-- ============================================================
-- 2. TABLA: publicaciones
--    Una publicación pertenece a un curso y la crea un docente.
-- ============================================================
CREATE TABLE auth_app.publicaciones (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    curso_id        UUID         NOT NULL REFERENCES auth_app.cursos(id) ON DELETE CASCADE,
    docente_id      UUID         NOT NULL REFERENCES auth_app.users(id)  ON DELETE CASCADE,
    tipo            auth_app.publicacion_tipo NOT NULL,

    -- Campos comunes
    titulo          VARCHAR(255),
    descripcion     TEXT,

    -- Clase Virtual
    link_reunion    VARCHAR(500),
    fecha_clase     TIMESTAMPTZ,

    -- Tarea / Material / Evaluación — archivo adjunto
    archivo_url     VARCHAR(1000),   -- URL en Supabase Storage
    archivo_nombre  VARCHAR(255),    -- Nombre original del archivo
    archivo_tipo    VARCHAR(100),    -- MIME type

    -- Tarea / Evaluación — fecha límite
    fecha_limite    TIMESTAMPTZ,
    permitir_envio_tardio BOOLEAN NOT NULL DEFAULT FALSE,

    -- Anuncio General / Contenido Inmediato
    fecha_inicio    TIMESTAMPTZ,
    fecha_fin       TIMESTAMPTZ,

    -- Portada del curso (se guarda aquí por publicación de tipo portada o en cursos_portadas)
    anio_periodo    VARCHAR(10) NOT NULL,

    -- Auditoría
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_pub_periodo_length
        CHECK (char_length(anio_periodo) >= 4 AND char_length(anio_periodo) <= 10)
);

COMMENT ON TABLE  auth_app.publicaciones IS 'Publicaciones de docentes en sus cursos (tareas, evaluaciones, materiales, etc).';
COMMENT ON COLUMN auth_app.publicaciones.archivo_url    IS 'URL del archivo subido a Supabase Storage.';
COMMENT ON COLUMN auth_app.publicaciones.fecha_limite   IS 'Para tareas y evaluaciones: fecha y hora máxima de entrega.';
COMMENT ON COLUMN auth_app.publicaciones.permitir_envio_tardio IS 'Si TRUE, el docente permite envíos fuera de la fecha límite.';

-- ============================================================
-- 3. TABLA: entregas_estudiantes
--    El estudiante entrega su tarea o evaluación.
-- ============================================================
CREATE TABLE auth_app.entregas_estudiantes (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    publicacion_id   UUID         NOT NULL REFERENCES auth_app.publicaciones(id) ON DELETE CASCADE,
    estudiante_id    UUID         NOT NULL REFERENCES auth_app.users(id)  ON DELETE CASCADE,

    -- Entrega: puede ser archivo o link
    archivo_url      VARCHAR(1000),
    archivo_nombre   VARCHAR(255),
    archivo_tipo     VARCHAR(100),
    link_entrega     VARCHAR(500),

    -- Comentario del estudiante al docente
    comentario       TEXT,

    -- Marca de tiempo de entrega
    entregado_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- Un estudiante solo puede entregar una vez por publicación
    CONSTRAINT uq_entrega_pub_estudiante
        UNIQUE (publicacion_id, estudiante_id)
);

COMMENT ON TABLE  auth_app.entregas_estudiantes IS 'Entregas de tareas y evaluaciones por estudiantes.';
COMMENT ON COLUMN auth_app.entregas_estudiantes.link_entrega IS 'Link alternativo si el estudiante entrega por URL.';

-- ============================================================
-- 4. TABLA: cursos_portadas
--    Almacena la portada personalizada de cada curso.
-- ============================================================
CREATE TABLE auth_app.cursos_portadas (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    curso_id    UUID         NOT NULL REFERENCES auth_app.cursos(id) ON DELETE CASCADE,
    docente_id  UUID         NOT NULL REFERENCES auth_app.users(id)  ON DELETE SET NULL,
    imagen_url  VARCHAR(1000) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_portada_curso_docente
        UNIQUE (curso_id, docente_id)
);

COMMENT ON TABLE auth_app.cursos_portadas IS 'Portadas personalizadas de los cursos subidas por docentes.';

-- ============================================================
-- 5. ÍNDICES
-- ============================================================
CREATE INDEX idx_pub_curso        ON auth_app.publicaciones(curso_id);
CREATE INDEX idx_pub_docente      ON auth_app.publicaciones(docente_id);
CREATE INDEX idx_pub_tipo         ON auth_app.publicaciones(tipo);
CREATE INDEX idx_pub_periodo      ON auth_app.publicaciones(anio_periodo);
CREATE INDEX idx_pub_created      ON auth_app.publicaciones(created_at ASC);

CREATE INDEX idx_entrega_pub      ON auth_app.entregas_estudiantes(publicacion_id);
CREATE INDEX idx_entrega_est      ON auth_app.entregas_estudiantes(estudiante_id);
CREATE INDEX idx_entrega_at       ON auth_app.entregas_estudiantes(entregado_at DESC);

CREATE INDEX idx_portada_curso    ON auth_app.cursos_portadas(curso_id);

-- ============================================================
-- 6. TRIGGERS updated_at
-- ============================================================
CREATE TRIGGER trg_publicaciones_updated_at
    BEFORE UPDATE ON auth_app.publicaciones
    FOR EACH ROW EXECUTE FUNCTION auth_app.set_updated_at();

CREATE TRIGGER trg_entregas_updated_at
    BEFORE UPDATE ON auth_app.entregas_estudiantes
    FOR EACH ROW EXECUTE FUNCTION auth_app.set_updated_at();

CREATE TRIGGER trg_portadas_updated_at
    BEFORE UPDATE ON auth_app.cursos_portadas
    FOR EACH ROW EXECUTE FUNCTION auth_app.set_updated_at();

-- ============================================================
-- 7. PERMISOS para springboot_app
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_app.publicaciones        TO springboot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_app.entregas_estudiantes TO springboot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_app.cursos_portadas      TO springboot_app;

-- ============================================================
-- 8. RLS — bloquear acceso directo anónimo
-- ============================================================
ALTER TABLE auth_app.publicaciones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_app.entregas_estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_app.cursos_portadas      ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_block_anon_publicaciones
    ON auth_app.publicaciones        FOR ALL USING (FALSE);

CREATE POLICY rls_block_anon_entregas
    ON auth_app.entregas_estudiantes FOR ALL USING (FALSE);

CREATE POLICY rls_block_anon_portadas
    ON auth_app.cursos_portadas      FOR ALL USING (FALSE);

-- ============================================================
-- 9. Extender audit_log con eventos del módulo inicio
-- ============================================================
ALTER TABLE auth_app.audit_log
    DROP CONSTRAINT IF EXISTS chk_event_type_valid;

ALTER TABLE auth_app.audit_log
    ADD CONSTRAINT chk_event_type_valid
    CHECK (event_type IN (
        -- Auth
        'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT',
        'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED',
        'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED',
        'EMAIL_VERIFIED', 'TOKEN_REFRESHED', 'TOKEN_REVOKED',
        'REGISTER_SUCCESS',
        -- Módulo cursos
        'CURSO_CREATED', 'CURSO_UPDATED', 'CURSO_DELETED',
        'DOCENTE_CURSO_ASIGNADO', 'DOCENTE_CURSO_REMOVIDO',
        -- Módulo estudiantes
        'MATRICULA_CREADA', 'MATRICULA_REMOVIDA',
        'CLASE_CREADA', 'CLASE_INICIO_MARCADO', 'CLASE_FIN_MARCADO',
        'ASISTENCIA_REGISTRADA', 'ASISTENCIA_ACTUALIZADA',
        -- Módulo inicio / publicaciones
        'PUBLICACION_CREADA', 'PUBLICACION_ELIMINADA',
        'ENTREGA_CREADA', 'ENTREGA_ACTUALIZADA',
        'PORTADA_ACTUALIZADA'
    ));

-- ============================================================
-- FIN DEL SCRIPT MÓDULO INICIO
-- ============================================================
CREATE TABLE auth_app.notas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    publicacion_id UUID NOT NULL,
    estudiante_id UUID NOT NULL,
    registrado_por UUID,

    nota NUMERIC(5,2) NOT NULL,
    comentario TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_nota_publicacion
        FOREIGN KEY (publicacion_id)
        REFERENCES auth_app.publicaciones(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_nota_estudiante
        FOREIGN KEY (estudiante_id)
        REFERENCES auth_app.users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_nota_registrado_por
        FOREIGN KEY (registrado_por)
        REFERENCES auth_app.users(id),

    CONSTRAINT uq_nota_pub_estudiante
        UNIQUE (publicacion_id, estudiante_id)
);

CREATE INDEX idx_notas_publicacion
ON auth_app.notas(publicacion_id);

CREATE INDEX idx_notas_estudiante
ON auth_app.notas(estudiante_id);

CREATE INDEX idx_notas_registrado_por
ON auth_app.notas(registrado_por);

CREATE OR REPLACE FUNCTION auth_app.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notas_updated_at
BEFORE UPDATE ON auth_app.notas
FOR EACH ROW
EXECUTE FUNCTION auth_app.update_updated_at_column();