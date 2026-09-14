import type { Documento } from "./datos-demo";

/**
 * Plazos de atención de documentos.
 *
 * El diseño clasifica la prioridad por los días que restan hasta el plazo
 * (Alta < 10, Media 10–30, Baja > 30). Aquí se resuelve la parte
 * operativa: qué documentos abiertos ya vencieron y cuáles vencen pronto.
 */

/** Ventana por defecto del aviso "vencen pronto", en días. */
export const DIAS_AVISO = 7;

const ABIERTOS: Documento["estado"][] = ["Pendiente", "En proceso"];

/** "dd/mm/yyyy" → Date a medianoche local. */
export function parsearFecha(texto: string): Date | null {
  const [d, m, a] = texto.split("/").map(Number);
  if (!d || !m || !a) return null;
  return new Date(a, m - 1, d);
}

/** Días enteros entre hoy y el plazo; negativo si ya venció. */
export function diasRestantes(plazo: string, hoy: Date): number | null {
  const fecha = parsearFecha(plazo);
  if (!fecha) return null;
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((fecha.getTime() - inicio.getTime()) / 86_400_000);
}

export type ResumenPlazos = {
  vencidos: Documento[];
  /** Vencen dentro de la ventana, hoy incluido. */
  porVencer: Documento[];
};

export function resumenPlazos(
  documentos: Documento[],
  hoy: Date,
  dias = DIAS_AVISO,
): ResumenPlazos {
  const vencidos: Documento[] = [];
  const porVencer: Documento[] = [];

  for (const documento of documentos) {
    if (!ABIERTOS.includes(documento.estado)) continue;
    const restantes = diasRestantes(documento.plazo, hoy);
    if (restantes === null) continue;
    if (restantes < 0) vencidos.push(documento);
    else if (restantes <= dias) porVencer.push(documento);
  }

  return { vencidos, porVencer };
}

/** `true` si el documento está abierto y vencido o por vencer. */
export function requiereAtencion(
  documento: Documento,
  hoy: Date,
  dias = DIAS_AVISO,
): boolean {
  if (!ABIERTOS.includes(documento.estado)) return false;
  const restantes = diasRestantes(documento.plazo, hoy);
  return restantes !== null && restantes <= dias;
}
