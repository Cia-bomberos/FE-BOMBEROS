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

const TIPOS: TipoDocumento[] = [
  "Oficio", "Nota Informativa", "Informe", "Memorando", "Carta", "Solicitud", "Acta",
];
const ESTADOS: EstadoDocumento[] = ["Pendiente", "En proceso", "Atendido", "Archivado"];
const PRIORIDADES: Prioridad[] = ["Alta", "Media", "Baja"];

const texto = (formData: FormData, clave: string) =>
  String(formData.get(clave) ?? "").trim();

/* ---------- Registrar (RF-0003, RF-0004) ---------- */

export async function registrar(
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const bombero = await exigirSesion();
  if (!puedeRegistrar(bombero)) {
    return error("Su cuenta no tiene una sección asignada para registrar documentos.");
  }

  const tipo = texto(formData, "tipo") as TipoDocumento;
  const numero = texto(formData, "numero");
  const asunto = texto(formData, "asunto");
  const origen = texto(formData, "origen");
  const destino = texto(formData, "destino");
  const seccion = texto(formData, "seccion") as ClaveSeccion;
  const via = texto(formData, "via") === "Físico" ? "Físico" : "Digital";
  const folios = Number(formData.get("folios") ?? 0);
  const plazo = aFechaLocal(texto(formData, "plazo"));
  const prioridadManual = texto(formData, "prioridad");

  if (!TIPOS.includes(tipo)) return error("Seleccione el tipo de documento.", "tipo");
  if (!/^\d{1,4}$/.test(numero)) {
    return error("Indique el número del documento (solo dígitos).", "numero");
  }
  if (asunto.length < 8) return error("Describa el asunto del documento.", "asunto");
  if (!origen) return error("Indique el remitente.", "origen");
  if (!destino) return error("Indique a quién va dirigido.", "destino");
  if (!seccionPorClave(seccion) || !seccionesParaRegistrar(bombero).includes(seccion)) {
    return error("Seleccione la sección responsable.", "seccion");
  }
  if (!Number.isInteger(folios) || folios < 1) {
    return error("Indique la cantidad de folios.", "folios");
  }
  if (!plazo || !parsearFecha(plazo)) return error("Indique el plazo de atención.", "plazo");
  if (prioridadManual && !PRIORIDADES.includes(prioridadManual as Prioridad)) {
    return error("Prioridad no válida.", "prioridad");
  }

  const archivo = formData.get("archivo");
  const adjunto =
    archivo instanceof File && archivo.size > 0
      ? { nombre: archivo.name, tamano: tamano(archivo.size), actualizado: hoy() }
      : undefined;

  let id: string;
  try {
    ({ id } = await registrarDocumento(
      {
        tipo, numero, asunto, origen, destino, seccion, via, folios, plazo,
        prioridad: prioridadManual ? (prioridadManual as Prioridad) : undefined,
        adjunto,
      },
      bombero,
    ));
  } catch (e) {
    return error(e instanceof Error ? e.message : "No se pudo registrar el documento.");
  }

  revalidatePath("/panel/bandeja-documental");
  redirect(`/panel/bandeja-documental/documentos/${id}`);
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
  if (!ESTADOS.includes(estado)) return error("Seleccione el nuevo estado.", "estado");
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

  // TODO(integración): subir el binario a Google Drive vía gateway.
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

  await eliminarDocumento(id);
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
