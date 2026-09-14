import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/sesion";
import {
  esJefatura,
  puedeVer,
  seccionesVisibles,
  type ClaveSeccion,
} from "@/lib/secciones";

/**
 * Guardas de acceso del Dashboard (RF-0012): la Jefatura ve todo; cada Jefe
 * de Sección, solo su sección. `obtenerSesion` está cacheada por petición,
 * así que llamarla aquí y en el layout no repite trabajo.
 */

/** Exige sesión con acceso a la sección; si no, devuelve al dashboard. */
export async function exigirSeccion(clave: ClaveSeccion) {
  const bombero = await obtenerSesion();
  if (!bombero) redirect("/login");
  if (!puedeVer(bombero, clave)) redirect("/panel/dashboard");
  return bombero;
}

/**
 * Para la vista general: la Jefatura la ve completa; un Jefe de Sección con
 * una sola sección va directo a ella.
 */
export async function resolverVistaGeneral() {
  const bombero = await obtenerSesion();
  if (!bombero) redirect("/login");

  const secciones = seccionesVisibles(bombero);
  if (!esJefatura(bombero) && secciones.length === 1) {
    redirect(secciones[0].ruta);
  }

  return { bombero, secciones, jefatura: esJefatura(bombero) };
}
