import type { Documento } from "./datos-demo";
import { tieneRol } from "./roles";
import {
  esJefatura,
  seccionesVisibles,
  type ClaveSeccion,
} from "./secciones";
import type { Bombero } from "./tipos";

/**
 * Permisos sobre la bandeja documental (RF-0002, RN-0004, RN-0005, RN-0021, RN-0028).
 *
 * - Jefatura: consulta y gestiona todo.
 * - Jefe de Sección: solo los documentos de su sección.
 * - Jefe de Administración: consulta todo en solo lectura para el
 *   seguimiento general, pero solo gestiona lo de Administración. Es el
 *   único que puede eliminar un registro Archivado, de cualquier sección.
 * - La sección que registró o derivó un documento conserva su consulta en
 *   solo lectura aunque ya no sea la responsable (RN-0021). El backend lo
 *   autoriza y lo informa con `solo_lectura`; aquí lo reflejamos para que
 *   la interfaz no lo trate como inexistente.
 *
 * RNF-0004: estas reglas también deben validarse en el backend; aquí solo
 * gobiernan lo que la interfaz muestra y permite intentar.
 */

/** Secciones que gestionan documentos en el backend de la bandeja. */
export const SECCIONES_BANDEJA: ClaveSeccion[] = [
  "administracion",
  "servicio-general",
  "maquinas",
  "sanidad",
];

const clavesDe = (bombero: Bombero): ClaveSeccion[] =>
  seccionesVisibles(bombero).map((s) => s.clave);

/**
 * Jefe de Sección de Administración. Se mira el grupo, no las secciones
 * visibles: Jefatura las ve todas y no por eso es Administración.
 */
export function esAdministracion(bombero: Bombero): boolean {
  return tieneRol(bombero, "Jefe_Administracion");
}

/** Ve toda la bandeja: Jefatura o Jefe de Administración. */
export function veBandejaCompleta(bombero: Bombero): boolean {
  return esJefatura(bombero) || esAdministracion(bombero);
}

export function puedeVerDocumento(bombero: Bombero, documento: Documento) {
  return veBandejaCompleta(bombero) || clavesDe(bombero).includes(documento.seccion);
}

/**
 * RN-0021 / CU-008: la sección que registró o derivó el documento conserva
 * la consulta en solo lectura aunque ya no sea la responsable.
 *
 * Confiamos en `documento.soloLectura`, que el backend calcula y expone en
 * GET /documentos y GET /documentos/{id}. Como respaldo (mocks, respuestas
 * antiguas), miramos si la sección del usuario aparece en la trazabilidad.
 */
export function puedeVerDocumentoDerivado(
  bombero: Bombero,
  documento: Documento,
): boolean {
  if (puedeVerDocumento(bombero, documento)) return true;
  if (documento.soloLectura) return true;
  if (!documento.trazabilidad) return false;
  const claves = new Set(clavesDe(bombero));
  return documento.trazabilidad.some(
    (etapa) => etapa.seccion !== undefined && claves.has(etapa.seccion),
  );
}

/**
 * Modificar, derivar, cambiar estado, adjuntar, registrar envío externo.
 * Un documento marcado como solo lectura no se gestiona, aunque el rol lo
 * permitiera por otras vías: el backend lo rechazaría igual.
 */
export function puedeGestionarDocumento(bombero: Bombero, documento: Documento) {
  if (documento.soloLectura) return false;
  return esJefatura(bombero) || clavesDe(bombero).includes(documento.seccion);
}

/**
 * Registrar un documento nuevo: lo hace la sección que lo recibe, que el
 * backend toma del token. La Jefatura no registra directamente.
 */
export function puedeRegistrar(bombero: Bombero): boolean {
  return seccionesParaRegistrar(bombero).length > 0;
}

/** Sección en la que quedará registrado el documento (la del bombero). */
export function seccionesParaRegistrar(bombero: Bombero): ClaveSeccion[] {
  if (esJefatura(bombero)) return [];
  return clavesDe(bombero).filter((clave) => SECCIONES_BANDEJA.includes(clave));
}

/** Eliminar el registro completo: solo Administración, solo Archivado. */
export function puedeEliminar(bombero: Bombero, documento: Documento): boolean {
  return esAdministracion(bombero) && documento.estado === "Archivado";
}

/**
 * Filtro de listados. A diferencia de `puedeVerDocumento`, incluye los
 * documentos que la sección propia registró o derivó (RN-0021), para que
 * sigan apareciendo en la bandeja en modo lectura.
 */
export function documentosVisibles(bombero: Bombero, documentos: Documento[]) {
  return documentos.filter((d) => puedeVerDocumentoDerivado(bombero, d));
}