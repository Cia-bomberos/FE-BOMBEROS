import {
  ahoraDemo,
  INVENTARIO_SANIDAD,
  INVENTARIO_SERVICIO_GENERAL,
  UNIDADES,
} from "./datos-demo";
import { SECCIONES, seccionPorClave, seccionesVisibles, type ClaveSeccion } from "./secciones";
import type { Bombero } from "./tipos";

/**
 * Repositorio de activos y recursos del inventario.
 *
 * Mismo esquema que `documentos-repo`: almacén en memoria sembrado con los
 * inventarios de demostración de cada sección, que sobrevive a la recarga
 * en caliente y se reinicia con el proceso.
 *
 * TODO(integración): GET/POST /inventario y PUT /inventario/{codigo} en el
 * gateway. Las páginas y acciones no cambian.
 */

export type EstadoActivo =
  | "Operativo"
  | "En reparación"
  | "De baja"
  | "Disponible"
  | "Bajo stock"
  | "Vencido";

export const ESTADOS_ACTIVO: EstadoActivo[] = [
  "Operativo", "En reparación", "De baja", "Disponible", "Bajo stock", "Vencido",
];

export const CATEGORIAS_ACTIVO = [
  "Mobiliario", "Equipo", "Suministro", "Insumo médico", "Unidad vehicular",
] as const;

export type CategoriaActivo = (typeof CATEGORIAS_ACTIVO)[number];

export type Activo = {
  /** Identificador único, asignado por la plataforma (p. ej. SG-011). */
  codigo: string;
  descripcion: string;
  categoria: CategoriaActivo;
  cantidad: number;
  ubicacion: string;
  estado: EstadoActivo;
  seccion: ClaveSeccion;
  /** Datos adicionales del recurso (opcional). */
  observaciones?: string;
  registrado: string;
  responsable: string;
};

/** Prefijo del identificador por sección. */
const PREFIJO: Partial<Record<ClaveSeccion, string>> = {
  "servicio-general": "SG",
  sanidad: "SN",
  maquinas: "MQ",
};

/** Secciones que administran inventario (fuente "inventario"). */
export const SECCIONES_INVENTARIO = SECCIONES.filter((s) => s.fuente === "inventario");

function sembrar(): Activo[] {
  const base = { registrado: "01/08/2026", responsable: "Carga inicial" };
  return [
    ...INVENTARIO_SERVICIO_GENERAL.map<Activo>((a) => ({
      ...base,
      codigo: a.codigo,
      descripcion: a.descripcion,
      categoria: a.categoria,
      cantidad: a.cantidad,
      ubicacion: a.ubicacion,
      estado: a.estado,
      seccion: "servicio-general",
    })),
    ...INVENTARIO_SANIDAD.map<Activo>((i) => ({
      ...base,
      codigo: i.codigo,
      descripcion: i.descripcion,
      categoria: "Insumo médico",
      cantidad: i.cantidad,
      ubicacion: i.ubicacion,
      estado: i.estado,
      seccion: "sanidad",
      observaciones: `Mínimo ${i.minimo} · vence ${i.vence}`,
    })),
    ...UNIDADES.map<Activo>((u, i) => ({
      ...base,
      codigo: `MQ-${String(i + 1).padStart(3, "0")}`,
      descripcion: u.denominacion,
      categoria: "Unidad vehicular",
      cantidad: 1,
      ubicacion: "Patio de máquinas",
      estado:
        u.estado === "Operativa" ? "Operativo"
        : u.estado === "En mantenimiento" ? "En reparación"
        : "De baja",
      seccion: "maquinas",
      observaciones: `${u.kilometraje.toLocaleString("es-PE")} km · próximo mantenimiento ${u.proximoMantenimiento}`,
    })),
  ];
}

type Almacen = { activos: Activo[] };

const global = globalThis as unknown as { __f3Inventario?: Almacen };
const almacen: Almacen = (global.__f3Inventario ??= { activos: sembrar() });

const clonar = <T>(valor: T): T => structuredClone(valor);

export async function listarActivos(): Promise<Activo[]> {
  return clonar(almacen.activos);
}

export async function obtenerActivo(codigo: string): Promise<Activo | null> {
  const activo = almacen.activos.find((a) => a.codigo === codigo);
  return activo ? clonar(activo) : null;
}

/* ---------- Permisos ---------- */

/** Secciones con inventario que el bombero puede consultar o registrar. */
export function seccionesInventarioDe(bombero: Bombero): ClaveSeccion[] {
  const visibles = seccionesVisibles(bombero).map((s) => s.clave);
  return SECCIONES_INVENTARIO.map((s) => s.clave).filter((c) => visibles.includes(c));
}

export function puedeRegistrarActivo(bombero: Bombero): boolean {
  return seccionesInventarioDe(bombero).length > 0;
}

export function activosVisibles(bombero: Bombero, activos: Activo[]): Activo[] {
  const claves = seccionesInventarioDe(bombero);
  return activos.filter((a) => claves.includes(a.seccion));
}

/* ---------- Registro ---------- */

export type DatosActivo = Omit<Activo, "codigo" | "registrado" | "responsable">;

/** Asigna el siguiente identificador único de la sección (RN-0036). */
function siguienteCodigo(seccion: ClaveSeccion): string {
  const prefijo = PREFIJO[seccion] ?? seccion.slice(0, 2).toUpperCase();
  const mayor = almacen.activos
    .filter((a) => a.codigo.startsWith(`${prefijo}-`))
    .reduce((max, a) => Math.max(max, Number(a.codigo.split("-")[1]) || 0), 0);
  return `${prefijo}-${String(mayor + 1).padStart(3, "0")}`;
}

export async function registrarActivo(datos: DatosActivo, actor: Bombero): Promise<Activo> {
  const ahora = ahoraDemo();
  const activo: Activo = {
    ...datos,
    codigo: siguienteCodigo(datos.seccion),
    registrado: fecha(ahora),
    responsable: `${actor.grado.replace(" CBP", "")} ${actor.nombre}`,
  };
  almacen.activos.unshift(activo);
  return clonar(activo);
}

export const nombreSeccion = (clave: ClaveSeccion) =>
  seccionPorClave(clave)?.nombre ?? clave;

const dos = (n: number) => String(n).padStart(2, "0");
const fecha = (d: Date) => `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`;
