import {
  DOCUMENTOS,
  INVENTARIO_SANIDAD,
  INVENTARIO_SERVICIO_GENERAL,
  PERIODO_ACTUAL,
  REGISTROS_KPI,
  UNIDADES,
} from "./datos-demo";
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
  | "Gestión Administrativa"
  | "Personal y Capacitación"
  | "Desarrollo Institucional"
  | "Imagen Institucional";

export type FuenteKpi =
  /** Se calcula del inventario registrado en la plataforma (RN-0036). */
  | "inventario"
  /** Se calcula de la gestión documental registrada (RN-0037). */
  | "documental"
  /** Valor del periodo registrado por la sección (formulario o importación). */
  | "registro";

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

export const KPIS: Kpi[] = [
  /* ---------- Operatividad ---------- */
  {
    clave: "disponibilidad-unidades",
    nombre: "Disponibilidad de unidades",
    descripcion:
      "Porcentaje de unidades que se encuentran operativas y disponibles para el servicio.",
    formula: "(Unidades operativas ÷ Total de unidades) × 100",
    unidad: "%",
    area: "Operatividad",
    seccionOrigen: "Máquinas",
    secciones: ["maquinas"],
    fuente: "inventario",
  },
  {
    clave: "tiempo-respuesta",
    nombre: "Tiempo promedio de respuesta",
    descripcion:
      "Tiempo promedio desde la activación o despacho de la unidad hasta su llegada al lugar de la emergencia.",
    formula: "Σ tiempos de respuesta ÷ N.° de servicios",
    unidad: "min",
    area: "Operatividad",
    seccionOrigen: "Máquinas / Atención Prehospitalaria",
    secciones: ["maquinas", "sanidad"],
    fuente: "registro",
    registra:
      "Promedio de minutos entre despacho y llegada, sobre los servicios del periodo.",
  },
  {
    clave: "unidades-fuera",
    nombre: "Unidades fuera de servicio",
    descripcion:
      "Cantidad de unidades que no se encuentran disponibles para atención de emergencias.",
    formula: "Conteo de unidades fuera de servicio",
    unidad: "N.°",
    area: "Operatividad",
    seccionOrigen: "Máquinas",
    secciones: ["maquinas"],
    fuente: "inventario",
  },

  /* ---------- Gestión Administrativa ---------- */
  {
    clave: "documentos-atendidos",
    nombre: "Documentos atendidos",
    descripcion:
      "Nivel de cumplimiento en la atención de documentos recibidos por la Compañía.",
    formula: "(Documentos atendidos ÷ Documentos recibidos) × 100",
    unidad: "%",
    area: "Gestión Administrativa",
    seccionOrigen: "Administración",
    secciones: ["administracion"],
    fuente: "documental",
  },
  {
    clave: "files-actualizados",
    nombre: "Files del personal actualizados",
    descripcion:
      "Porcentaje de files del personal con la documentación requerida y actualizada.",
    formula: "(N.° de files actualizados ÷ Total de files del personal) × 100",
    unidad: "%",
    area: "Gestión Administrativa",
    seccionOrigen: "Administración",
    secciones: ["administracion"],
    fuente: "registro",
    registra:
      "Files actualizados y total de files del personal.",
  },
  {
    clave: "procesos-pendientes",
    nombre: "Procesos administrativos pendientes",
    descripcion:
      "Cantidad de trámites o procesos que permanecen pendientes de atención o conclusión.",
    formula: "Conteo de procesos pendientes",
    unidad: "N.°",
    area: "Gestión Administrativa",
    seccionOrigen: "Administración",
    secciones: ["administracion"],
    fuente: "documental",
  },
  {
    clave: "mantenimientos-infraestructura",
    nombre: "Mantenimientos de infraestructura ejecutados",
    descripcion:
      "Cumplimiento de los mantenimientos de infraestructura programados.",
    formula: "(Mantenimientos ejecutados ÷ Mantenimientos programados) × 100",
    unidad: "%",
    area: "Gestión Administrativa",
    seccionOrigen: "Servicios Generales",
    secciones: ["servicio-general"],
    fuente: "registro",
    registra:
      "Mantenimientos ejecutados y programados en el periodo.",
  },

  /* ---------- Personal y Capacitación ---------- */
  {
    clave: "bomberos-capacitados",
    nombre: "Bomberos capacitados",
    descripcion:
      "Porcentaje de bomberos que participaron en al menos una actividad de capacitación durante el periodo.",
    formula: "(Bomberos capacitados ÷ Total de bomberos considerados) × 100",
    unidad: "%",
    area: "Personal y Capacitación",
    seccionOrigen: "Instrucción y Entrenamiento",
    secciones: ["instruccion"],
    fuente: "registro",
    registra:
      "Bomberos con al menos una capacitación y total considerado.",
  },
  {
    clave: "cumplimiento-capacitacion",
    nombre: "Cumplimiento del plan de capacitación",
    descripcion:
      "Grado de cumplimiento de las actividades de capacitación programadas.",
    formula: "(Capacitaciones ejecutadas ÷ Capacitaciones programadas) × 100",
    unidad: "%",
    area: "Personal y Capacitación",
    seccionOrigen: "Instrucción y Entrenamiento",
    secciones: ["instruccion"],
    fuente: "registro",
    registra:
      "Capacitaciones ejecutadas y programadas en el periodo.",
  },
  {
    clave: "incidentes",
    nombre: "Incidentes/accidentes registrados",
    descripcion:
      "Cantidad de incidentes o accidentes relacionados con las actividades del personal.",
    formula: "Conteo de incidentes/accidentes registrados",
    unidad: "N.°",
    area: "Personal y Capacitación",
    seccionOrigen: "Seguridad y Salud Ocupacional",
    secciones: ["sso"],
    fuente: "registro",
    registra:
      "Incidentes o accidentes registrados en el periodo.",
  },

  /* ---------- Desarrollo Institucional ---------- */
  {
    clave: "proyectos-activos",
    nombre: "Proyectos activos",
    descripcion:
      "Cantidad de proyectos institucionales en ejecución o gestión.",
    formula: "Conteo de proyectos activos",
    unidad: "N.°",
    area: "Desarrollo Institucional",
    seccionOrigen: "Proyectos y Relaciones Institucionales",
    secciones: ["proyectos"],
    fuente: "registro",
    registra:
      "Proyectos en ejecución o gestión al cierre del periodo.",
  },
  {
    clave: "convenios",
    nombre: "Convenios/alianzas concretados",
    descripcion:
      "Cantidad de convenios o alianzas institucionales formalizados durante el periodo.",
    formula: "Conteo de convenios/alianzas concretados",
    unidad: "N.°",
    area: "Desarrollo Institucional",
    seccionOrigen: "Proyectos y Relaciones Institucionales",
    secciones: ["proyectos"],
    fuente: "registro",
    registra:
      "Convenios o alianzas formalizados en el periodo.",
  },
  {
    clave: "recursos-gestionados",
    nombre: "Recursos gestionados",
    descripcion:
      "Valor económico de recursos obtenidos mediante proyectos, donaciones, convenios o cooperación.",
    formula: "Σ valor de recursos gestionados",
    unidad: "S/",
    area: "Desarrollo Institucional",
    seccionOrigen: "Proyectos y Relaciones Institucionales / Administración",
    secciones: ["proyectos"],
    fuente: "registro",
    registra:
      "Valor en soles de los recursos obtenidos en el periodo.",
  },

  /* ---------- Imagen Institucional ---------- */
  {
    clave: "actividades-difundidas",
    nombre: "Actividades difundidas",
    descripcion:
      "Porcentaje de actividades institucionales difundidas mediante los canales oficiales.",
    formula:
      "(Actividades difundidas ÷ Actividades que correspondía difundir) × 100",
    unidad: "%",
    area: "Imagen Institucional",
    seccionOrigen: "Imagen de Compañía",
    secciones: ["imagen"],
    fuente: "registro",
    registra:
      "Actividades difundidas y actividades que correspondía difundir.",
  },
  {
    clave: "actividades-realizadas",
    nombre: "Actividades institucionales realizadas",
    descripcion:
      "Cantidad de actividades institucionales realizadas durante el periodo.",
    formula: "Conteo de actividades realizadas",
    unidad: "N.°",
    area: "Imagen Institucional",
    seccionOrigen: "Imagen de Compañía / Administración",
    secciones: ["imagen"],
    fuente: "registro",
    registra:
      "Actividades institucionales realizadas en el periodo.",
  },
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
  /** Solo en KPIs de registro: quién cargó el valor y cuándo. */
  registro?: string;
};

/**
 * Calcula el KPI con la información registrada en la plataforma.
 *
 * TODO(integración): cuando el inventario y la bandeja se sirvan desde el
 * API Gateway, este es el único lugar que cambia. Las vistas reciben
 * `ValorKpi` y no saben de dónde salió el número.
 */
export function calcularKpi(kpi: Kpi): ValorKpi {
  switch (kpi.clave) {
    case "disponibilidad-unidades": {
      const operativas = UNIDADES.filter((u) => u.estado === "Operativa").length;
      return {
        kpi,
        valor: porcentaje(operativas, UNIDADES.length),
        detalle: `${operativas} de ${UNIDADES.length} unidades operativas`,
      };
    }

    case "unidades-fuera": {
      const fuera = UNIDADES.filter((u) => u.estado === "Fuera de servicio");
      const mantenimiento = UNIDADES.filter((u) => u.estado === "En mantenimiento");
      return {
        kpi,
        valor: String(fuera.length),
        detalle:
          mantenimiento.length > 0
            ? `Más ${mantenimiento.length} en mantenimiento`
            : "Ninguna en mantenimiento",
      };
    }

    case "documentos-atendidos": {
      const atendidos = DOCUMENTOS.filter(
        (d) => d.estado === "Atendido" || d.estado === "Archivado",
      ).length;
      return {
        kpi,
        valor: porcentaje(atendidos, DOCUMENTOS.length),
        detalle: `${atendidos} de ${DOCUMENTOS.length} documentos recibidos`,
      };
    }

    case "procesos-pendientes": {
      const pendientes = DOCUMENTOS.filter((d) => d.estado === "Pendiente").length;
      const enProceso = DOCUMENTOS.filter((d) => d.estado === "En proceso").length;
      return {
        kpi,
        valor: String(pendientes + enProceso),
        detalle: `${pendientes} sin atender · ${enProceso} en proceso`,
      };
    }

    default: {
      // KPIs de registro: valor cargado por la sección para el periodo.
      const registro = REGISTROS_KPI.find(
        (r) => r.kpi === kpi.clave && r.periodo === PERIODO_ACTUAL,
      );

      if (!registro) {
        return {
          kpi,
          valor: null,
          detalle: `Sin valor registrado para ${etiquetaPeriodo(PERIODO_ACTUAL)}`,
        };
      }

      return {
        kpi,
        valor: formatear(registro.valor, kpi.unidad),
        detalle: registro.detalle ?? etiquetaPeriodo(registro.periodo),
        registro: `${registro.registradoPor} · ${registro.fecha}`,
      };
    }
  }
}

/** KPIs asignados a una sección del dashboard, ya calculados. */
export function kpisDeSeccion(clave: ClaveSeccion): ValorKpi[] {
  return KPIS.filter((kpi) => kpi.secciones.includes(clave)).map(calcularKpi);
}

/** KPIs del catálogo que el diseño no ubica en ninguna sección. */
export function kpisSinSeccion(): Kpi[] {
  return KPIS.filter((kpi) => kpi.secciones.length === 0);
}

/* ---------- Resúmenes de inventario que alimentan cada sección ---------- */

export function resumenServicioGeneral() {
  const total = INVENTARIO_SERVICIO_GENERAL.length;
  const contar = (estado: string) =>
    INVENTARIO_SERVICIO_GENERAL.filter((a) => a.estado === estado).length;
  return {
    total,
    operativos: contar("Operativo"),
    enReparacion: contar("En reparación"),
    deBaja: contar("De baja"),
  };
}

export function resumenSanidad() {
  const total = INVENTARIO_SANIDAD.length;
  const contar = (estado: string) =>
    INVENTARIO_SANIDAD.filter((i) => i.estado === estado).length;
  return {
    total,
    disponibles: contar("Disponible"),
    bajoStock: contar("Bajo stock"),
    vencidos: contar("Vencido"),
  };
}

function formatear(valor: number, unidad: Kpi["unidad"]): string {
  if (unidad === "S/") return valor.toLocaleString("es-PE");
  if (unidad === "min") return valor.toLocaleString("es-PE", { maximumFractionDigits: 1 });
  return String(valor);
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
