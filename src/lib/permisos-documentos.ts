import type { Documento } from "./datos-demo";
import { normalizar, tieneRol } from "./roles";
import {
  esJefatura,
  seccionesVisibles,
  type ClaveSeccion,
} from "./secciones";
import type { Bombero } from "./tipos";

/**
 * Permisos sobre la bandeja documental (RF-0002, RN-0004, RN-0005, RN-0028).
 *
 * - Jefatura: consulta y gestiona todo.
 * - Jefe de Sección: solo los documentos de su sección.
 * - Jefe de Administración: consulta todo en solo lectura para el
 *   seguimiento general, pero solo gestiona lo de Administración. Es el
 *   único que puede eliminar un registro Archivado, de cualquier sección.
 *
 * RNF-0004: estas reglas también deben validarse en el backend; aquí solo
 * gobiernan lo que la interfaz muestra y permite intentar.
 */

const clavesDe = (bombero: Bombero): ClaveSeccion[] =>
  seccionesVisibles(bombero).map((s) => s.clave);

/**
 * Jefe de Sección de Administración. Se mira el grupo (o la sección del
 * atributo), no las secciones visibles: Jefatura las ve todas y no por eso
 * es Administración.
 */
export function esAdministracion(bombero: Bombero): boolean {
  if (bombero.grupos.length > 0) return tieneRol(bombero, "Jefe_Administracion");
  return normalizar(bombero.seccion) === "administracion";
}

/** Ve toda la bandeja: Jefatura o Jefe de Administración. */
export function veBandejaCompleta(bombero: Bombero): boolean {
  return esJefatura(bombero) || esAdministracion(bombero);
}

export function puedeVerDocumento(bombero: Bombero, documento: Documento) {
  return veBandejaCompleta(bombero) || clavesDe(bombero).includes(documento.seccion);
}

/** Modificar, derivar, cambiar estado, adjuntar, registrar envío externo. */
export function puedeGestionarDocumento(bombero: Bombero, documento: Documento) {
  return esJefatura(bombero) || clavesDe(bombero).includes(documento.seccion);
}

/** Registrar un documento nuevo: cualquiera con sección; Jefatura elige la sección. */
export function puedeRegistrar(bombero: Bombero): boolean {
  return esJefatura(bombero) || clavesDe(bombero).length > 0;
}

/** Secciones que el bombero puede indicar como responsable al registrar. */
export function seccionesParaRegistrar(bombero: Bombero): ClaveSeccion[] {
  return clavesDe(bombero);
}

/** Eliminar el registro completo: solo Administración, solo Archivado. */
export function puedeEliminar(bombero: Bombero, documento: Documento): boolean {
  return esAdministracion(bombero) && documento.estado === "Archivado";
}

export function documentosVisibles(bombero: Bombero, documentos: Documento[]) {
  return documentos.filter((d) => puedeVerDocumento(bombero, d));
}
