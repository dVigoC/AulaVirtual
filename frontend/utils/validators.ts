// utils/validators.ts
export const validarPeriodo = (valor: string): string | null => {
  const regex = /^\d{4}-(I|II)$/;
  if (!regex.test(valor)) {
    return "Formato inválido. Usa: 2026-I o 2026-II";
  }
  const anio = parseInt(valor.split("-")[0]);
  const anioActual = new Date().getFullYear();
  if (anio < 2000 || anio > anioActual + 2) {
    return `El año debe estar entre 2000 y ${anioActual + 2}`;
  }
  return null; // válido
};
