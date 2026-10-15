import type { Documento } from "./datos-demo";
import { parsearFecha, resumenPlazos } from "./plazos";

/**
 * Métricas del resumen de la Bandeja Documental, calculadas sobre los
 * documentos reales que el usuario puede ver (el backend ya filtra por
 * sección). Funciones puras: reciben la fecha de hoy para ser testeables.
 */

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export type PuntoMensual = { mes: string; anio: number; valor: number };

/** Documentos ingresados por mes en los últimos `meses`, hasta el mes de `hoy`. */
export function serieMensual(documentos: Documento[], hoy: Date, meses = 6): PuntoMensual[] {
  const serie: PuntoMensual[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    serie.push({ mes: MESES_CORTOS[fecha.getMonth()], anio: fecha.getFullYear(), valor: 0 });
  }

  for (const documento of documentos) {
    const ingreso = parsearFecha(documento.fechaIngreso);
    if (!ingreso) continue;
    const punto = serie.find(
      (p) => p.anio === ingreso.getFullYear() && p.mes === MESES_CORTOS[ingreso.getMonth()],
    );
    if (punto) punto.valor++;
  }

  return serie;
}

export type KpisBandeja = {
  /** Ingresados en el mes en curso. */
  ingresosMes: number;
  /** % frente al mes anterior; `null` si el mes anterior no tuvo ingresos. */
  variacionIngresos: number | null;
  /** Pendientes + En proceso. */
  porAtender: number;
  /** Abiertos con el plazo ya vencido. */
  vencidos: number;
  /** Atendidos + Archivados. */
  atendidos: number;
  total: number;
};

export function kpisBandeja(documentos: Documento[], hoy: Date): KpisBandeja {
  const [previo, actual] = serieMensual(documentos, hoy, 2);
  const abiertos = documentos.filter((d) => d.estado === "Pendiente" || d.estado === "En proceso");
  const atendidos = documentos.filter((d) => d.estado === "Atendido" || d.estado === "Archivado");

  return {
    ingresosMes: actual.valor,
    variacionIngresos: variacion(actual.valor, previo.valor),
    porAtender: abiertos.length,
    vencidos: resumenPlazos(documentos, hoy).vencidos.length,
    atendidos: atendidos.length,
    total: documentos.length,
  };
}

export type ResumenSerie = {
  total: number;
  promedio: number;
  pico: PuntoMensual | null;
  variacion: number | null;
  previo: PuntoMensual | null;
};

/** Cifras de la tira bajo el gráfico. */
export function resumenSerie(serie: PuntoMensual[]): ResumenSerie {
  const total = serie.reduce((s, p) => s + p.valor, 0);
  const pico = total > 0 && serie.length ? serie.reduce((a, b) => (b.valor > a.valor ? b : a), serie[0]!) : null;
  const ultimo = serie.at(-1);
  const previo = serie.at(-2) ?? null;

  return {
    total,
    promedio: serie.length ? Math.round(total / serie.length) : 0,
    pico,
    variacion: ultimo && previo ? variacion(ultimo.valor, previo.valor) : null,
    previo,
  };
}

export type CuotaTipo = { tipo: string; cantidad: number; porcentaje: number };

/**
 * Reparto por tipo documental, de mayor a menor. Pasados `maximo` tipos, el
 * resto se agrupa en "Otros" para que las barras sigan siendo legibles.
 */
export function distribucionTipos(documentos: Documento[], maximo = 5): CuotaTipo[] {
  const conteo = new Map<string, number>();
  for (const { tipo } of documentos) conteo.set(tipo, (conteo.get(tipo) ?? 0) + 1);

  const filas = [...conteo].map(([tipo, cantidad]) => ({ tipo, cantidad })).sort((a, b) => b.cantidad - a.cantidad);
  const visibles =
    filas.length > maximo
      ? [
          ...filas.slice(0, maximo - 1),
          { tipo: "Otros", cantidad: filas.slice(maximo - 1).reduce((s, f) => s + f.cantidad, 0) },
        ]
      : filas;

  const total = documentos.length;
  return visibles.map((f) => ({ ...f, porcentaje: total ? Math.round((f.cantidad / total) * 100) : 0 }));
}

function variacion(actual: number, previo: number): number | null {
  return previo === 0 ? null : Math.round(((actual - previo) / previo) * 100);
}
