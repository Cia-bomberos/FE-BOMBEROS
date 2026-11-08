/**
 * Criterio de búsqueda común al buscador global y a la tabla de Documentos:
 * "Ver todos los resultados" debe mostrar lo mismo que encontró la paleta.
 */

/** Sin tildes ni mayúsculas: "Secretaría" y "secretaria" son lo mismo. */
export const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Palabras de la consulta, normalizadas. */
export const tokensDe = (consulta: string) => normalizar(consulta).split(/\s+/).filter(Boolean);

/** Si todas las palabras aparecen en los campos, en cualquier orden. */
export function coincideBusqueda(tokens: string[], campos: string[]): boolean {
  const pajar = normalizar(campos.join(" "));
  return tokens.every((token) => pajar.includes(token));
}
