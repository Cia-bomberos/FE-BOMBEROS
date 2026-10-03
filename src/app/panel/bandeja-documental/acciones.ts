"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ahoraDemo,
  type EstadoDocumento,
  type Prioridad,
  type TipoDocumento,
} from "@/lib/datos-demo";
import {
  actualizarAdjunto,
  cambiarEstado,
  derivarDocumento,
  eliminarDocumento,
  obtenerDocumento,
  registrarDocumento,
  registrarEnvioExterno,
} from "@/lib/documentos-repo";
import {
  puedeEliminar,
  puedeGestionarDocumento,
  puedeRegistrar,
  seccionesParaRegistrar,
} from "@/lib/permisos-documentos";
import { parsearFecha } from "@/lib/plazos";
import { seccionPorClave, type ClaveSeccion } from "@/lib/secciones";
import { obtenerSesion } from "@/lib/sesion";
import type { Bombero } from "@/lib/tipos";
import type { EstadoAccion } from "./estado";

/**
 * Acciones de la bandeja documental. Cada una vuelve a comprobar sesión y
 * permiso en el servidor: la interfaz oculta lo que no corresponde, pero
 * la decisión final no depende de ella (RNF-0004).
 */

const TIPOS = new Set<TipoDocumento>([
  "Oficio", "Nota Informativa", "Informe", "Memorando", "Carta", "Solicitud", "Acta",
]);
const ESTADOS = new Set<EstadoDocumento>(["Pendiente", "En proceso", "Atendido", "Archivado"]);
const PRIORIDADES = new Set<Prioridad>(["Alta", "Media", "Baja"]);

const texto = (formData: FormData, clave: string) => {
  const valor = formData.get(clave);
  return typeof valor === "string" ? valor.trim() : "";
};

/* ---------- Registrar (RF-0003, RF-0004) ---------- */

export async function registrar(
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const bombero = await exigirSesion();
  if (!puedeRegistrar(bombero)) {
    return error("Su cuenta no tiene una sección asignada para registrar documentos.");
  }

  const datos = obtenerDatosRegistro(formData);
  const validacion = validarRegistro(datos, bombero);
  if (validacion) return validacion;

  let id: string;
  try {
    ({ id } = await registrarDocumento(
      {
        tipo: datos.tipo,
        numero: datos.numero,
        asunto: datos.asunto,
        origen: datos.origen,
        destino: datos.destino,
        seccion: datos.seccion,
        via: datos.via,
        folios: datos.folios,
        plazo: datos.plazo,
        prioridad: datos.prioridad,
        adjunto: obtenerAdjuntoRegistro(formData),
      },
      bombero,
    ));
  } catch (e) {
    return error(e instanceof Error ? e.message : "No se pudo registrar el documento.");
  }

  revalidatePath("/panel/bandeja-documental");
  redirect(`/panel/bandeja-documental/documentos/${id}`);
}

type DatosRegistro = {
  tipo: TipoDocumento;
  numero: string;
  asunto: string;
  origen: string;
  destino: string;
  seccion: ClaveSeccion;
  via: "Físico" | "Digital";
  folios: number;
  plazo: string;
  prioridadManual: string;
  prioridad?: Prioridad;
};

function obtenerDatosRegistro(formData: FormData): DatosRegistro {
  const prioridadManual = texto(formData, "prioridad");

  return {
    tipo: texto(formData, "tipo") as TipoDocumento,
    numero: texto(formData, "numero"),
    asunto: texto(formData, "asunto"),
    origen: texto(formData, "origen"),
    destino: texto(formData, "destino"),
    seccion: texto(formData, "seccion") as ClaveSeccion,
    via: texto(formData, "via") === "Físico" ? "Físico" : "Digital",
    folios: Number(formData.get("folios") ?? 0),
    plazo: aFechaLocal(texto(formData, "plazo")),
    prioridadManual,
    prioridad: prioridadManual ? (prioridadManual as Prioridad) : undefined,
  };
}

function validarRegistro(datos: DatosRegistro, bombero: Bombero): EstadoAccion | undefined {
  if (!TIPOS.has(datos.tipo)) return error("Seleccione el tipo de documento.", "tipo");
  if (!/^\d{1,4}$/.test(datos.numero)) {
    return error("Indique el número del documento (solo dígitos).", "numero");
  }
  if (datos.asunto.length < 8) return error("Describa el asunto del documento.", "asunto");
  if (!datos.origen) return error("Indique el remitente.", "origen");
  if (!datos.destino) return error("Indique a quién va dirigido.", "destino");
  if (!seccionPorClave(datos.seccion) || !seccionesParaRegistrar(bombero).includes(datos.seccion)) {
    return error("Seleccione la sección responsable.", "seccion");
  }
  if (!Number.isInteger(datos.folios) || datos.folios < 1) {
    return error("Indique la cantidad de folios.", "folios");
  }
  if (!datos.plazo || !parsearFecha(datos.plazo)) {
    return error("Indique el plazo de atención.", "plazo");
  }
  if (datos.prioridadManual && !PRIORIDADES.has(datos.prioridadManual as Prioridad)) {
    return error("Prioridad no válida.", "prioridad");
  }
}

function obtenerAdjuntoRegistro(formData: FormData) {
  const archivo = formData.get("archivo");
  return archivo instanceof File && archivo.size > 0
    ? { nombre: archivo.name, tamano: tamano(archivo.size), actualizado: hoy() }
    : undefined;
}

/* ---------- Modificar (RF-0005 a RF-0008) ---------- */

export async function derivar(
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { bombero, documento, id } = await exigirGestion(formData);
  if (!documento) return sinPermiso();

  const seccion = texto(formData, "seccion") as ClaveSeccion;
  if (!seccionPorClave(seccion)) return error("Seleccione la sección destino.", "seccion");
  if (seccion === documento.seccion) {
    return error("El documento ya está en esa sección.", "seccion");
  }

  await derivarDocumento(id, seccion, texto(formData, "nota"), bombero);
  return listo(id, `Derivado a ${seccionPorClave(seccion)!.nombre}.`);
}

export async function cambiarEstadoDocumento(
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { bombero, documento, id } = await exigirGestion(formData);
  if (!documento) return sinPermiso();

  const estado = texto(formData, "estado") as EstadoDocumento;
  if (!ESTADOS.has(estado)) return error("Seleccione el nuevo estado.", "estado");
  if (estado === documento.estado) return error("El documento ya está en ese estado.", "estado");

  await cambiarEstado(id, estado, texto(formData, "nota"), bombero);
  return listo(id, `Estado actualizado a ${estado}.`);
}

export async function envioExterno(
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { bombero, documento, id } = await exigirGestion(formData);
  if (!documento) return sinPermiso();

  const medio = texto(formData, "medio");
  const destinatario = texto(formData, "destinatario");
  if (!medio) return error("Indique el medio de envío.", "medio");
  if (!destinatario) return error("Indique la entidad destinataria.", "destinatario");

  await registrarEnvioExterno(id, medio, destinatario, bombero);
  return listo(id, "Envío externo registrado. La gestión queda Atendida.");
}

export async function adjuntar(
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { bombero, documento, id } = await exigirGestion(formData);
  if (!documento) return sinPermiso();

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return error("Seleccione el archivo a adjuntar.", "archivo");
  }

  // Falta (integración): subir el binario a Google Drive vía gateway.
  await actualizarAdjunto(
    id,
    { nombre: archivo.name, tamano: tamano(archivo.size), actualizado: hoy() },
    bombero,
  );
  return listo(id, `Adjunto actualizado: ${archivo.name}.`);
}

/* ---------- Eliminar archivado (RF-0009, RN-0028) ---------- */

export async function eliminarArchivado(
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const bombero = await exigirSesion();
  const id = texto(formData, "id");
  const documento = await obtenerDocumento(id);

  if (!documento || !puedeEliminar(bombero, documento)) {
    return error(
      "Solo el Jefe de Administración puede eliminar registros, y únicamente en estado Archivado.",
    );
  }
  if (formData.get("confirmacion") !== "on") {
    return error("Confirme que el documento ya está respaldado en Google Drive.", "confirmacion");
  }

  eliminarDocumento(id);
  revalidatePath("/panel/bandeja-documental");
  redirect("/panel/bandeja-documental/documentos?eliminado=1");
}

/* ---------- Auxiliares ---------- */

async function exigirSesion(): Promise<Bombero> {
  const bombero = await obtenerSesion();
  if (!bombero) redirect("/login");
  return bombero;
}

async function exigirGestion(formData: FormData) {
  const bombero = await exigirSesion();
  const id = texto(formData, "id");
  const documento = await obtenerDocumento(id);
  const permitido = documento && puedeGestionarDocumento(bombero, documento);
  return { bombero, id, documento: permitido ? documento : null };
}

function listo(id: string, mensaje: string): EstadoAccion {
  revalidatePath("/panel/bandeja-documental");
  revalidatePath(`/panel/bandeja-documental/documentos/${id}`);
  return { estado: "ok", mensaje };
}

const error = (mensaje: string, campo?: string): EstadoAccion => ({
  estado: "error", mensaje, campo,
});

const sinPermiso = () =>
  error("No tiene permiso para gestionar este documento: pertenece a otra sección.");

/** "yyyy-mm-dd" del <input type="date"> → "dd/mm/yyyy". */
function aFechaLocal(iso: string): string {
  const [a, m, d] = iso.split("-");
  return a && m && d ? `${d}/${m}/${a}` : "";
}

function tamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

const hoy = () => {
  const d = ahoraDemo();
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`;
};
