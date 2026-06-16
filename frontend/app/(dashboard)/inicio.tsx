// ── app/(dashboard)/inicio.tsx ───────────────────────────────────────────────
// Módulo de inicio del aula virtual: cursos, publicaciones, tareas y entregas.
// Accesible para ADMIN, DOCENTE y ESTUDIANTE según su rol.
import InicioModule from "../../components/inicio/InicioScreen";

export default function InicioPage() {
  return <InicioModule />;
}
