import { notFound } from "next/navigation";

/**
 * Atrapa cualquier `/panel/...` sin ruta propia para que el 404 se muestre
 * dentro del layout del panel (con su barra y su sesión) y no en el raíz.
 */
export default function RutaInexistente() {
  notFound();
}
