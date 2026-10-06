import {
  INVENTARIO_SANIDAD,
  INVENTARIO_SERVICIO_GENERAL,
  PERIODO_ACTUAL,
  REGISTROS_KPI,
  UNIDADES,
  type Documento,
} from "./datos-demo";
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

/**
 * Fábrica de KPIs con argumentos posicionales: a diferencia de escribir
 * `{ clave: ..., nombre: ..., descripcion: ... }` quince veces (el molde de
 * propiedades repetido es justo lo que SonarQube cuenta como duplicación),
 * acá el nombre de cada campo se escribe UNA sola vez, en la firma. Cada
 * entrada de abajo es solo una lista de valores.
 */
function crearKpi(
  clave: string,
  nombre: string,
  descripcion: string,
  formula: string,
  unidad: Kpi["unidad"],
  area: AreaKpi,
  ubicacion: Pick<Kpi, "seccionOrigen" | "secciones" | "fuente" | "registra">,
): Kpi {
  return { clave, nombre, descripcion, formula, unidad, area, ...ubicacion };
}

export const KPIS: Kpi[] = [
  /* ---------- Operatividad ---------- */
  crearKpi(
    "disponibilidad-unidades",
    "Disponibilidad de unidades",
    "Porcentaje de unidades que se encuentran operativas y disponibles para el servicio.",
    "(Unidades operativas ÷ Total de unidades) × 100",
    "%", "Operatividad", { seccionOrigen: "Máquinas", secciones: ["maquinas"], fuente: "inventario" },
  ),
  crearKpi(
    "tiempo-respuesta",
    "Tiempo promedio de respuesta",
    "Tiempo promedio desde la activación o despacho de la unidad hasta su llegada al lugar de la emergencia.",
    "Σ tiempos de respuesta ÷ N.° de servicios",
    "min", "Operatividad", { seccionOrigen: "Máquinas / Atención Prehospitalaria", secciones: ["maquinas", "sanidad"], fuente: "registro", registra: "Promedio de minutos entre despacho y llegada, sobre los servicios del periodo." },
  ),
  crearKpi(
    "unidades-fuera",
    "Unidades fuera de servicio",
    "Cantidad de unidades que no se encuentran disponibles para atención de emergencias.",
    "Conteo de unidades fuera de servicio",
    "N.°", "Operatividad", { seccionOrigen: "Máquinas", secciones: ["maquinas"], fuente: "inventario" },
  ),

  /* ---------- Gestión Administrativa ---------- */
  crearKpi(
    "documentos-atendidos",
    "Documentos atendidos",
    "Nivel de cumplimiento en la atención de documentos recibidos por la Compañía.",
    "(Documentos atendidos ÷ Documentos recibidos) × 100",
    "%", "Gestión Administrativa", { seccionOrigen: "Administración", secciones: ["administracion"], fuente: "documental" },
  ),
  crearKpi(
    "files-actualizados",
    "Files del personal actualizados",
    "Porcentaje de files del personal con la documentación requerida y actualizada.",
    "(N.° de files actualizados ÷ Total de files del personal) × 100",
    "%", "Gestión Administrativa", { seccionOrigen: "Administración", secciones: ["administracion"], fuente: "registro", registra: "Files actualizados y total de files del personal." },
  ),
  crearKpi(
    "procesos-pendientes",
    "Procesos administrativos pendientes",
    "Cantidad de trámites o procesos que permanecen pendientes de atención o conclusión.",
    "Conteo de procesos pendientes",
    "N.°", "Gestión Administrativa", { seccionOrigen: "Administración", secciones: ["administracion"], fuente: "documental" },
  ),
  crearKpi(
    "mantenimientos-infraestructura",
    "Mantenimientos de infraestructura ejecutados",
    "Cumplimiento de los mantenimientos de infraestructura programados.",
    "(Mantenimientos ejecutados ÷ Mantenimientos programados) × 100",
    "%", "Gestión Administrativa", { seccionOrigen: "Servicios Generales", secciones: ["servicio-general"], fuente: "registro", registra: "Mantenimientos ejecutados y programados en el periodo." },
  ),

  /* ---------- Personal y Capacitación ---------- */
  crearKpi(
    "bomberos-capacitados",
    "Bomberos capacitados",
    "Porcentaje de bomberos que participaron en al menos una actividad de capacitación durante el periodo.",
    "(Bomberos capacitados ÷ Total de bomberos considerados) × 100",
    "%", "Personal y Capacitación", { seccionOrigen: "Instrucción y Entrenamiento", secciones: ["instruccion"], fuente: "registro", registra: "Bomberos con al menos una capacitación y total considerado." },
  ),
  crearKpi(
    "cumplimiento-capacitacion",
    "Cumplimiento del plan de capacitación",
    "Grado de cumplimiento de las actividades de capacitación programadas.",
    "(Capacitaciones ejecutadas ÷ Capacitaciones programadas) × 100",
    "%", "Personal y Capacitación", { seccionOrigen: "Instrucción y Entrenamiento", secciones: ["instruccion"], fuente: "registro", registra: "Capacitaciones ejecutadas y programadas en el periodo." },
  ),
  crearKpi(
    "incidentes",
    "Incidentes/accidentes registrados",
    "Cantidad de incidentes o accidentes relacionados con las actividades del personal.",
    "Conteo de incidentes/accidentes registrados",
    "N.°", "Personal y Capacitación", { seccionOrigen: "Seguridad y Salud Ocupacional", secciones: ["sso"], fuente: "registro", registra: "Incidentes o accidentes registrados en el periodo." },
  ),

  /* ---------- Desarrollo Institucional ---------- */
  crearKpi(
    "proyectos-activos",
    "Proyectos activos",
    "Cantidad de proyectos institucionales en ejecución o gestión.",
    "Conteo de proyectos activos",
    "N.°", "Desarrollo Institucional", { seccionOrigen: "Proyectos y Relaciones Institucionales", secciones: ["proyectos"], fuente: "registro", registra: "Proyectos en ejecución o gestión al cierre del periodo." },
  ),
  crearKpi(
    "convenios",
    "Convenios/alianzas concretados",
    "Cantidad de convenios o alianzas institucionales formalizados durante el periodo.",
    "Conteo de convenios/alianzas concretados",
    "N.°", "Desarrollo Institucional", { seccionOrigen: "Proyectos y Relaciones Institucionales", secciones: ["proyectos"], fuente: "registro", registra: "Convenios o alianzas formalizados en el periodo." },
  ),
  crearKpi(
    "recursos-gestionados",
    "Recursos gestionados",
    "Valor económico de recursos obtenidos mediante proyectos, donaciones, convenios o cooperación.",
    "Σ valor de recursos gestionados",
    "S/", "Desarrollo Institucional", { seccionOrigen: "Proyectos y Relaciones Institucionales / Administración", secciones: ["proyectos"], fuente: "registro", registra: "Valor en soles de los recursos obtenidos en el periodo." },
  ),

  /* ---------- Imagen Institucional ---------- */
  crearKpi(
    "actividades-difundidas",
    "Actividades difundidas",
    "Porcentaje de actividades institucionales difundidas mediante los canales oficiales.",
    "(Actividades difundidas ÷ Actividades que correspondía difundir) × 100",
    "%", "Imagen Institucional", { seccionOrigen: "Imagen de Compañía", secciones: ["imagen"], fuente: "registro", registra: "Actividades difundidas y actividades que correspondía difundir." },
  ),
  crearKpi(
    "actividades-realizadas",
    "Actividades institucionales realizadas",
    "Cantidad de actividades institucionales realizadas durante el periodo.",
    "Conteo de actividades realizadas",
    "N.°", "Imagen Institucional", { seccionOrigen: "Imagen de Compañía / Administración", secciones: ["imagen"], fuente: "registro", registra: "Actividades institucionales realizadas en el periodo." },
  ),
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
  periodo = PERIODO_ACTUAL,
): Promise<ValorKpi> {
  switch (kpi.clave) {
    case "disponibilidad-unidades": {
      const operativas = UNIDADES.filter((u) => u.estado === "Operativa").length;
      return {
        kpi,
        valor: porcentaje(operativas, UNIDADES.length),
        detalle: `${operativas} de ${UNIDADES.length} unidades operativas · hoy`,
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
            ? `Más ${mantenimiento.length} en mantenimiento · hoy`
            : "Ninguna en mantenimiento · hoy",
      };
    }

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
      // KPIs de registro: valor cargado por la sección para el periodo.
      const registro = REGISTROS_KPI.find(
        (r) => r.kpi === kpi.clave && r.periodo === periodo,
      );

      if (!registro) {
        return {
          kpi,
          valor: null,
          detalle: `Sin valor registrado para ${etiquetaPeriodo(periodo)}`,
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
  periodo = PERIODO_ACTUAL,
): Promise<ValorKpi[]> {
  return Promise.all(
    KPIS.filter((kpi) => kpi.secciones.includes(clave)).map((kpi) =>
      calcularKpi(kpi, periodo),
    ),
  );
}

/** Periodos con datos, del más reciente al más antiguo (RN-0035). */
export function periodosDisponibles(): string[] {
  const periodos = new Set<string>([PERIODO_ACTUAL, ...REGISTROS_KPI.map((r) => r.periodo)]);
  return [...periodos].sort((a, b) => b.localeCompare(a));
}

/**
 * Serie mensual de un KPI de registro a lo largo de los periodos con datos,
 * del más antiguo al más reciente. Para la gráfica de evolución.
 */
export function serieDeKpi(kpi: Kpi): { periodo: string; valor: number }[] {
  return REGISTROS_KPI.filter((r) => r.kpi === kpi.clave)
    .sort((a, b) => a.periodo.localeCompare(b.periodo))
    .map((r) => ({ periodo: r.periodo, valor: r.valor }));
}

/** Normaliza el `?periodo=` de la URL: si no existe, el actual. */
export function resolverPeriodo(valor: string | undefined): string {
  return valor && periodosDisponibles().includes(valor) ? valor : PERIODO_ACTUAL;
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