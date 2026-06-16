INSERT INTO auth_app.users (
    username, email, password_hash, full_name,
    role, is_active, email_verified, account_locked
)
VALUES
(
    'admin.sistema',
    'admin@aulavirtual.com',
    crypt('admin1234!', gen_salt('bf', 12)),
    'Administrador del Sistema',
    'ADMIN', TRUE, TRUE, FALSE
),
(
    'prof.garcia',
    'docente@aulavirtual.com',
    crypt('docente1234!', gen_salt('bf', 12)),
    'Prof. García López',
    'DOCENTE', TRUE, TRUE, FALSE
),
(
    'juan.perez',
    'estudiante@aulavirtual.com',
    crypt('estudi1234!', gen_salt('bf', 12)),
    'Juan Pérez Ríos',
    'ESTUDIANTE', TRUE, TRUE, FALSE
);
----------------------------------------------------------------------

INSERT INTO auth_app.users (
    username, email, password_hash, full_name,
    role, is_active, email_verified, account_locked
)
VALUES
(
    'Elias.sifuentes',
    'estudiante1@aulavirtual.com',
    crypt('estudi1234!', gen_salt('bf', 12)),
    'Elias Sifuentes',
    'ESTUDIANTE', TRUE, TRUE, FALSE
),
(
    'Louis.garcia',
    'estudiante2@aulavirtual.com',
    crypt('estudi1234!', gen_salt('bf', 12)),
    'Louis García López',
    'ESTUDIANTE', TRUE, TRUE, FALSE
),
(
    'Samanta.garcia',
    'estudiante4@aulavirtual.com',
    crypt('estudi1234!', gen_salt('bf', 12)),
    'Samanta García López',
    'ESTUDIANTE', TRUE, TRUE, FALSE
),
(
    'Eduardo.garcia',
    'estudiante5@aulavirtual.com',
    crypt('estudi1234!', gen_salt('bf', 12)),
    'Eduardo García López',
    'ESTUDIANTE', TRUE, TRUE, FALSE
),
(
    'Mario.perez',
    'estudiante3@aulavirtual.com',
    crypt('estudi1234!', gen_salt('bf', 12)),
    'Mario Pérez Ríos',
    'ESTUDIANTE', TRUE, TRUE, FALSE
);

