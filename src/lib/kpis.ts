import {
  type Documento,
} from "./tipos-documento";
import { listarDocumentosSiDisponible } from "./documentos-repo";
import type { ClaveSeccion } from "./secciones";

/**
 * Catálogo de indicadores de la Compañía (documento "KPIs") y su cálculo.
 *
 * Cada KPI conserva la definición original (qué mide, fórmula, unidad y
 * área temática) y se asigna a una sección del dashboard: las cuatro del
 * Documento de Análisis y Diseño o las cuatro que nombra el propio catálogo
 * en su columna "Sección relacionada". Los que no pueden derivarse del
 * inventario ni de la bandeja se alimentan con un valor registrado por
 * periodo (`REGISTROS_KPI`); si el periodo no tiene valor, la tarjeta lo
 * dice en lugar de omitirse en silencio.
 */

export type AreaKpi =
  | "Operatividad"
  | "Gestión Administrativa";

export type FuenteKpi = "documental";

export type Kpi = {
  clave: string;
  nombre: string;
  descripcion: string;
  formula: string;
  unidad: "%" | "min" | "N.°" | "S/";
  area: AreaKpi;
  /** Sección relacionada según el catálogo original. */
  seccionOrigen: string;
  /** Secciones del dashboard donde se muestra. */
  secciones: ClaveSeccion[];
  fuente: FuenteKpi;
  /** Para los de registro: qué dato concreto se carga cada periodo. */
  registra?: string;
};

/**
 * Fábrica de KPIs con argumentos posicionales: a diferencia de escribir
 * `{ clave: ..., nombre: ..., descripcion: ... }` quince veces (el molde de
 * propiedades repetido es justo lo que SonarQube cuenta como duplicación),
 * acá el nombre de cada campo se escribe UNA sola vez, en la firma. Cada
 * entrada de abajo es solo una lista de valores.
 */


export const KPIS: Kpi[] = [
  {
    clave: "documentos-atendidos",
    nombre: "Documentos atendidos",
    descripcion: "Nivel de cumplimiento en la atención de documentos recibidos por la Compañía.",
    formula: "(Documentos atendidos ÷ Documentos recibidos) × 100",
    unidad: "%",
    area: "Gestión Administrativa",
    seccionOrigen: "Administración",
    secciones: ["administracion"],
    fuente: "documental",
  },
  {
    clave: "procesos-pendientes",
    nombre: "Procesos administrativos pendientes",
    descripcion: "Cantidad de trámites o procesos que permanecen pendientes de atención o conclusión.",
    formula: "Conteo de procesos pendientes",
    unidad: "N.°",
    area: "Gestión Administrativa",
    seccionOrigen: "Administración",
    secciones: ["administracion"],
    fuente: "documental",
  },
  {
    clave: "tiempo-respuesta",
    nombre: "Tiempo promedio de respuesta",
    descripcion: "Tiempo promedio desde la activación hasta la llegada de la unidad.",
    formula: "Σ tiempos de respuesta ÷ N.° de servicios",
    unidad: "min",
    area: "Operatividad",
    seccionOrigen: "Máquinas / Atención Prehospitalaria",
    secciones: ["maquinas", "sanidad"],
    fuente: "documental",
  }
];

/* ================================================================== */
/* Cálculo                                                             */
/* ================================================================== */

export type ValorKpi = {
  kpi: Kpi;
  /** Valor formateado, o `null` si el periodo no tiene dato. */
  valor: string | null;
  /** Complemento del valor: "8 de 11", "27 en bandeja"… */
  detalle: string;
};

/**
 * Calcula el KPI para un periodo ("yyyy-mm") con la información registrada
 * en la plataforma. Los de inventario son una foto del estado actual; los
 * documentales cuentan los documentos ingresados en el periodo; los de
 * registro toman el valor cargado para ese periodo.
 *
 * Falta (integración): cuando el inventario y la bandeja se sirvan desde el
 * API Gateway, este es el único lugar que cambia. Las vistas reciben
 * `ValorKpi` y no saben de dónde salió el número.
 */
export async function calcularKpi(
  kpi: Kpi,
  periodo: string,
): Promise<ValorKpi> {
  switch (kpi.clave) {
    case "documentos-atendidos": {
      const documentos = await documentosDelPeriodo(periodo);
      const atendidos = documentos.filter(
        (d) => d.estado === "Atendido" || d.estado === "Archivado",
      ).length;
      return {
        kpi,
        valor: porcentaje(atendidos, documentos.length),
        detalle: `${atendidos} de ${documentos.length} recibidos en ${etiquetaPeriodo(periodo)}`,
      };
    }

    case "procesos-pendientes": {
      const documentos = await documentosDelPeriodo(periodo);
      const pendientes = documentos.filter((d) => d.estado === "Pendiente").length;
      const enProceso = documentos.filter((d) => d.estado === "En proceso").length;
      return {
        kpi,
        valor: String(pendientes + enProceso),
        detalle: `${pendientes} sin atender · ${enProceso} en proceso`,
      };
    }

    default: {

      return {
        kpi,
        valor: null,
        detalle: `Sin valor registrado para ${etiquetaPeriodo(periodo)}`,
      };
    }
  }
}

/** Documentos ingresados en el periodo "yyyy-mm" (fechaIngreso "dd/mm/yyyy"). */
async function documentosDelPeriodo(periodo: string): Promise<Documento[]> {
  const [anio, mes] = periodo.split("-");
  return (await listarDocumentosSiDisponible()).filter((d) => {
    const [, m, a] = d.fechaIngreso.split("/");
    return a === anio && m === mes;
  });
}

/** KPIs asignados a una sección del dashboard, ya calculados. */
export async function kpisDeSeccion(
  clave: ClaveSeccion,
  periodo: string,
): Promise<ValorKpi[]> {
  return Promise.all(
    KPIS.filter((kpi) => kpi.secciones.includes(clave)).map((kpi) =>
      calcularKpi(kpi, periodo),
    ),
  );
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre"];


/** "2026-08" → "agosto 2026". */
export function etiquetaPeriodo(periodo: string): string {
  const [anio, mes] = periodo.split("-");
  return `${MESES[Number(mes) - 1] ?? mes} ${anio}`;
}

function porcentaje(parte: number, total: number): string {
  if (total === 0) return "0";
  return String(Math.round((parte / total) * 100));
}

export function resolverPeriodo(valor: string | undefined): string {
  const actual = new Date();
  const periodoActual = `${actual.getFullYear()}-${String(actual.getMonth() + 1).padStart(2, "0")}`;
  return valor || periodoActual;
}

export function periodosDisponibles(): string[] {
  // Solo devolvemos el actual por ahora, ya que no hay REGISTROS_KPI
  return [resolverPeriodo(undefined)];
}