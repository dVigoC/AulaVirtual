// ── utils/uploadArchivo.ts ──────────────────────────────────────
import { supabase } from "./supabaseClient";
import { getToken } from "./tokenStorage";

/**
 * Sanitiza el nombre del archivo para usarlo de forma segura en el path
 * de Supabase Storage, preservando la extensión y el nombre legible.
 * Elimina tildes, espacios y caracteres especiales.
 */
function sanitizarNombre(nombre: string): string {
  return nombre
    .normalize("NFD") // descompone tildes: á → a + ́
    .replace(/[\u0300-\u036f]/g, "") // elimina los diacríticos
    .replace(/\s+/g, "_") // espacios → guion bajo
    .replace(/[^a-zA-Z0-9.\-_]/g, "_") // cualquier otro carácter especial → _
    .replace(/_+/g, "_") // colapsa guiones bajos consecutivos
    .toLowerCase(); // todo minúsculas para consistencia
}

export const uploadArchivo = async (
  file: File,
  carpeta: "publicaciones" | "entregas" | "portadas",
  cursoId: string,
): Promise<{ url: string; nombre: string }> => {
  // Nombre original sanitizado — se preserva en el path para que el navegador
  // lo use automáticamente como nombre de descarga (sin necesitar <a download>)
  const nombreSanitizado = sanitizarNombre(file.name);
  const nombreUnico = `${Date.now()}_${nombreSanitizado}`;
  const path = `${carpeta}/${cursoId}/${nombreUnico}`;

  // Inyectar el token del backend en el cliente Supabase
  // para cumplir políticas RLS que requieran auth.role() != 'anon'
  const token = await getToken();
  if (token) {
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: "",
    });
  }

  const { error } = await supabase.storage
    .from("archivos-aula")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error("Error real al subir el archivo:", error);
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from("archivos-aula").getPublicUrl(path);

  // Devolvemos el nombre ORIGINAL (sin sanitizar) para mostrarlo en la UI
  return { url: data.publicUrl, nombre: file.name };
};

export const deleteArchivo = async (url: string): Promise<void> => {
  const path = url.split("/archivos-aula/")[1];
  if (!path) return;
  await supabase.storage.from("archivos-aula").remove([path]);
};
