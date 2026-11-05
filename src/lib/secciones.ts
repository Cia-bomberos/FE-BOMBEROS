import { ROL_JEFATURA, tieneRol, type ClaveRol } from "./roles";
import type { Bombero } from "./tipos";

/**
 * Secciones del Dashboard Ejecutivo y control de acceso por rol.
 *
 * El Documento de Análisis y Diseño (RN-0034, RF-0012) define cuatro
 * secciones: Administración, Servicio General, Sanidad y Máquinas. El
 * catálogo de KPIs de la Compañía nombra además cuatro áreas cuyos
 * indicadores no salen del inventario ni de la bandeja, sino de un valor
 * registrado por periodo: Instrucción y Entrenamiento, Seguridad y Salud
 * Ocupacional, Proyectos y Relaciones Institucionales e Imagen de Compañía.
 * Se incorporan como secciones para que ningún KPI del catálogo quede sin
 * dueño. La Jefatura ve la vista general con todas; cada Jefe de Sección ve
 * únicamente la suya.
 *
 * El rol llega desde Cognito: el grupo del usuario (`cognito:groups`, ver
 * `roles.ts`) decide qué ve. Las cuatro secciones de KPIs por periodo no
 * tienen grupo propio en el User Pool, así que hoy solo las ve la Jefatura.
 *
 * El acceso sale SOLO del grupo. Los atributos del User Pool (como
 * `custom:seccion`) no cuentan: el propio usuario puede editarlos con su
 * token, y el rol nunca debe depender de algo que él controle.
 */

export type ClaveSeccion =
  | "administracion"
  | "servicio-general"
  | "sanidad"
  | "maquinas"
  | "instruccion"
  | "sso"
  | "proyectos"
  | "imagen";

/** Origen de los indicadores de una sección. */
export type FuenteSeccion =
  /** Calculados del inventario registrado (RN-0036). */
  | "inventario"
  /** Calculados de la gestión documental (RN-0037). */
  | "documental"
  /** Valor del periodo registrado por la sección (formulario o importación). */
  | "registro";

export const ETIQUETA_FUENTE: Record<FuenteSeccion, string> = {
  inventario: "inventario",
  documental: "gestión documental",
  registro: "registro por periodo",
};

export type Seccion = {
  clave: ClaveSeccion;
  nombre: string;
  ruta: string;
  /** Rol de Cognito del Jefe de esta Sección; `null` si aún no existe. */
  grupo: ClaveRol | null;
  /** Origen de sus indicadores. */
  fuente: FuenteSeccion;
  fuenteDetalle: string;
  descripcion: string;
  tono: string;
  /** Insignia del Manual de Marca (pp. 19-21); `null` si no se usa todavía. */
  insignia: string | null;
};

/** Logo que se muestra en el panel en lugar del escudo de la Compañía. */
export type Insignia = { src: string; alt: string };

function seccion(
  clave: ClaveSeccion,
  nombre: string,
  grupo: ClaveRol | null,
  fuente: FuenteSeccion,
  fuenteDetalle: string,
  descripcion: string,
  presentacion: { tono: string; insignia?: string | null },
): Seccion {
  return {
    clave,
    nombre,
    ruta: `/panel/dashboard/${clave}`,
    grupo,
    fuente,
    fuenteDetalle,
    descripcion,
    tono: presentacion.tono,
    insignia: presentacion.insignia ?? null,
  };
}

/** Grupo de Cognito con acceso a la vista general de las cuatro secciones. */
export const GRUPO_JEFATURA = ROL_JEFATURA;

export const SECCIONES: Seccion[] = [
  seccion("administracion",
    "Administración",
    "Jefe_Administracion",
    "documental",
    "Gestión documental: documentos ingresados, atendidos y pendientes",
    "Atención de documentos y trámites administrativos de la Compañía.",
    { tono: "var(--bleu)", insignia: "/insignias/administracion.png" },
  ),
  seccion("servicio-general",
    "Servicio General",
    "Jefe_ServicioGeneral",
    "inventario",
    "Inventario de mobiliario y suministros del cuartel",
    "Mobiliario, suministros y mantenimiento de la infraestructura del cuartel.",
    { tono: "var(--ambar)", insignia: "/insignias/servicio-general.png" },
  ),
  seccion("sanidad",
    "Sanidad",
    "Jefe_Sanidad",
    "inventario",
    "Inventario de insumos médicos",
    "Insumos médicos y atención prehospitalaria.",
    { tono: "var(--verde)", insignia: "/insignias/sanidad.png" },
    // En el Manual de Marca figura como "Sección de Atención Prehospitalaria".
  ),
  seccion("maquinas",
    "Máquinas",
    "Jefe_Maquinas",
    "inventario",
    "Inventario de unidades vehiculares y su estado",
    "Unidades vehiculares: autobombas, escala, ambulancias y rescate.",
    { tono: "var(--ember)", insignia: "/insignias/maquinas.png" },
  ),

  /* Secciones del catálogo de KPIs, con valor registrado por periodo.
     Sin grupo en Cognito: las consulta la Jefatura. */
  seccion(
    "instruccion",
    "Instrucción y Entrenamiento",
    null,
    "registro",
    "Valores del periodo registrados por la sección",
    "Capacitación del personal y cumplimiento del plan anual.",
    { tono: "var(--violeta)" },
  ),
  seccion(
    "sso",
    "Seguridad y Salud Ocupacional",
    null,
    "registro",
    "Valores del periodo registrados por la sección",
    "Incidentes y accidentes en las actividades del personal.",
    { tono: "var(--ambar)" },
  ),
  seccion(
    "proyectos",
    "Proyectos y Relaciones Institucionales",
    null,
    "registro",
    "Valores del periodo registrados por la sección",
    "Proyectos, convenios y recursos gestionados por la Compañía.",
    { tono: "var(--bleu)" },
  ),
  seccion(
    "imagen",
    "Imagen de Compañía",
    null,
    "registro",
    "Valores del periodo registrados por la sección",
    "Actividades institucionales y su difusión en canales oficiales.",
    { tono: "var(--verde)" },
  ),
];

export const seccionPorClave = (clave: string) =>
  SECCIONES.find((seccion) => seccion.clave === clave);

export function esJefatura(bombero: Bombero): boolean {
  return tieneRol(bombero, GRUPO_JEFATURA);
}

/** Secciones que el bombero puede consultar en el dashboard. */
export function seccionesVisibles(bombero: Bombero): Seccion[] {
  if (esJefatura(bombero)) return SECCIONES;

  return SECCIONES.filter(
    (seccion) => seccion.grupo !== null && tieneRol(bombero, seccion.grupo),
  );
}

export function puedeVer(bombero: Bombero, clave: ClaveSeccion): boolean {
  return seccionesVisibles(bombero).some((seccion) => seccion.clave === clave);
}

/**
 * Insignia de la sección a la que pertenece el bombero. La Jefatura no tiene
 * una sección en particular: devuelve `null` y el panel muestra el escudo.
 */
export function insigniaDe(bombero: Bombero): Insignia | null {
  const propia = SECCIONES.find(
    (seccion) => seccion.grupo !== null && seccion.grupo === bombero.rol,
  );
  if (!propia?.insignia) return null;

  return {
    src: propia.insignia,
    alt: `Insignia de la sección ${propia.nombre}`,
  };
}
