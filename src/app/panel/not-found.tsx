import type { Metadata } from "next";
import { NoEncontrada } from "./NoEncontrada";

export const metadata: Metadata = { title: "Página no encontrada" };

/**
 * 404 dentro del panel: se muestra con la barra superior, tanto para rutas
 * inexistentes (vía `[...resto]`) como cuando una página llama a `notFound()`
 * (p. ej. un documento que no existe o es de otra sección).
 */
export default function NoEncontradaPanel() {
  return (
    <NoEncontrada
      principal={{ href: "/panel/bandeja-documental", texto: "Volver al resumen" }}
      secundario={{ href: "/panel/bandeja-documental/documentos", texto: "Ver documentos" }}
    />
  );
}
