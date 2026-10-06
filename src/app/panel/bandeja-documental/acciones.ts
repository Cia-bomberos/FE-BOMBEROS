"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prioridad, TipoDocumento } from "@/lib/datos-demo";
import {
  actualizarAdjunto,
  asignarPrioridad,
  derivarDocumento,
  eliminarDocumento,
  ErrorBandeja,
  marcarAtendido,
  obtenerDocumento,
  registrarDocumento,
  registrarEnvioExterno,
  type DatosRegistro,
} from "@/lib/documentos-repo";
import {
  puedeEliminar,
  puedeGestionarDocumento,
  puedeRegistrar,
  SECCIONES_BANDEJA,
} from "@/lib/permisos-documentos";
import { parsearFecha } from "@/lib/plazos";
import { seccionPorClave, type ClaveSeccion } from "@/lib/secciones";
import { obtenerSesion } from "@/lib/sesion";
import type { Bombero } from "@/lib/tipos";
import type { EstadoAccion } from "./estado";

/**
 * Acciones de la bandeja documental. Cada una vuelve a comprobar sesión y
 * permiso en el servidor: la interfaz oculta lo que no corresponde, pero
 * la decisión final no depende de ella (RNF-0004). El backend valida otra
 * vez y, si rechaza, su mensaje se muestra tal cual.
 */

const TIPOS = new Set<TipoDocumento>([
  "Oficio", "Nota Informativa", "Informe", "Memorando", "Carta", "Solicitud", "Acta",
]);
const PRIORIDADES = new Set<Prioridad>(["Alta", "Media", "Baja"]);

/** RNF-0006: máximo 20 MB por archivo. */
const MAX_PDF = 20 * 1024 * 1024;

const texto = (formData: FormData, clave: string) => {
  const valor = formData.get(clave);
  return typeof valor === "string" ? valor.trim() : "";
};

/* ---------- Registrar (RF-0004, RN-0007, RN-0024) ---------- */

export async function registrar(
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const bombero = await exigirSesion();
  if (!puedeRegistrar(bombero)) {
    return error("Los documentos los registra la sección que los recibe; su cuenta no tiene una.");
  }

  const procedencia = texto(formData, "procedencia");
  if (procedencia !== "interno" && procedencia !== "externo") {
    return error("Indique si el documento es interno o externo.", "procedencia");
  }

  const tipo = texto(formData, "tipo") as TipoDocumento;
  if (procedencia === "interno" && !TIPOS.has(tipo)) {
    return error("Seleccione el tipo de documento.", "tipo");
  }

  const asunto = texto(formData, "asunto");
  if (asunto.length < 8) return error("Describa el asunto del documento.", "asunto");

  const plazo = aFechaLocal(texto(formData, "plazo"));
  if (!plazo || !parsearFecha(plazo)) return error("Indique el plazo de atención.", "plazo");

  const prioridad = texto(formData, "prioridad");
  if (prioridad && !PRIORIDADES.has(prioridad as Prioridad)) {
    return error("Prioridad no válida.", "prioridad");
  }

  const archivo = await validarPdf(formData.get("archivo"));
  if (typeof archivo === "string") return error(archivo, "archivo");

  const datos: DatosRegistro = {
    procedencia,
    tipo: procedencia === "interno" ? tipo : undefined,
    asunto,
    via: texto(formData, "via") === "Físico" ? "Físico" : "Digital",
    plazo,
    prioridad: prioridad ? (prioridad as Prioridad) : undefined,
    archivo,
  };

  let id: string;
  try {
    id = await registrarDocumento(datos);
  } catch (e) {
    return error(mensajeDe(e, "No se pudo registrar el documento."));
  }

  revalidatePath("/panel/bandeja-documental");
  redirect(`/panel/bandeja-documental/documentos/${id}`);
}

/* ---------- Modificar (RF-0004 a RF-0008) ---------- */

export async function derivar(
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { documento, id } = await exigirGestion(formData);
  if (!documento) return sinPermiso();

  const seccion = texto(formData, "seccion") as ClaveSeccion;
  if (!SECCIONES_BANDEJA.includes(seccion)) {
    return error("Seleccione la sección destino.", "seccion");
  }
  if (seccion === documento.seccion) {
    return error("El documento ya está en esa sección.", "seccion");
  }

  return ejecutar(id, `Derivado a ${seccionPorClave(seccion)?.nombre ?? seccion}.`, () =>
    derivarDocumento(id, seccion, texto(formData, "nota")),
  );
}

/**
 * Único cambio de estado manual que admite el backend: a "Atendido"
 * (RN-0008, RN-0011). "En proceso" llega al derivar y "Archivado" lo pone
 * el sistema a los 3 días de atendido (RN-0026).
 */
export async function cambiarEstadoDocumento(
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { documento, id } = await exigirGestion(formData);
  if (!documento) return sinPermiso();

  if (texto(formData, "estado") !== "Atendido") {
    return error("Solo puede marcar el documento como Atendido.", "estado");
  }
  if (documento.estado !== "Pendiente" && documento.estado !== "En proceso") {
    return error(`Un documento ${documento.estado} no puede pasar a Atendido.`, "estado");
  }

  return ejecutar(id, "Documento marcado como Atendido.", () =>
    marcarAtendido(id, texto(formData, "nota")),
  );
}

/** RN-0018, RF-0005: prioridad manual y/o nuevo plazo. */
export async function ajustarPrioridad(
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { documento, id } = await exigirGestion(formData);
  if (!documento) return sinPermiso();

  const prioridad = texto(formData, "prioridad");
  if (prioridad && !PRIORIDADES.has(prioridad as Prioridad)) {
    return error("Prioridad no válida.", "prioridad");
  }

  const plazoCrudo = texto(formData, "plazo");
  const plazo = plazoCrudo ? aFechaLocal(plazoCrudo) : "";
  if (plazoCrudo && !parsearFecha(plazo)) return error("Plazo no válido.", "plazo");

  if (!prioridad && !plazo) {
    return error("Indique una prioridad o un nuevo plazo.", "prioridad");
  }

  return ejecutar(id, "Prioridad y plazo actualizados.", () =>
    asignarPrioridad(id, {
      prioridad: prioridad ? (prioridad as Prioridad) : undefined,
      plazo: plazo || undefined,
    }),
  );
}

export async function envioExterno(
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { documento, id } = await exigirGestion(formData);
  if (!documento) return sinPermiso();

  const medio = texto(formData, "medio");
  const destinatario = texto(formData, "destinatario");
  if (!medio) return error("Indique el medio de envío.", "medio");
  if (!destinatario) return error("Indique la entidad destinataria.", "destinatario");

  return ejecutar(id, "Envío externo registrado. La gestión queda Atendida.", () =>
    registrarEnvioExterno(id, medio, destinatario),
  );
}

/** RN-0010: el adjunto solo se reemplaza mientras está "En proceso". */
export async function adjuntar(
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const { documento, id } = await exigirGestion(formData);
  if (!documento) return sinPermiso();

  if (documento.estado !== "En proceso") {
    return error("El archivo solo puede reemplazarse mientras el documento está En proceso.");
  }

  const archivo = await validarPdf(formData.get("archivo"));
  if (typeof archivo === "string") return error(archivo, "archivo");

  return ejecutar(id, `Adjunto actualizado: ${archivo.name}.`, () =>
    actualizarAdjunto(id, archivo),
  );
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

  try {
    await eliminarDocumento(id);
  } catch (e) {
    return error(mensajeDe(e, "No se pudo eliminar el documento."));
  }

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

/** Ejecuta la operación en el backend y traduce su rechazo a un mensaje. */
async function ejecutar(
  id: string,
  mensaje: string,
  operacion: () => Promise<void>,
): Promise<EstadoAccion> {
  try {
    await operacion();
  } catch (e) {
    return error(mensajeDe(e, "No se pudo completar la operación."));
  }
  revalidatePath("/panel/bandeja-documental");
  revalidatePath(`/panel/bandeja-documental/documentos/${id}`);
  return { estado: "ok", mensaje };
}

/** Los rechazos del backend se muestran; cualquier otro error, no. */
function mensajeDe(e: unknown, generico: string): string {
  return e instanceof ErrorBandeja ? e.message : generico;
}

/**
 * RNF-0006 y RNF-0007: PDF de hasta 20 MB, validado por su firma `%PDF-`
 * y no por la extensión. El backend repite la comprobación sobre S3.
 */
async function validarPdf(valor: FormDataEntryValue | null): Promise<File | string> {
  if (!(valor instanceof File) || valor.size === 0) return "Adjunte el documento en PDF.";
  if (valor.size > MAX_PDF) return "El archivo supera los 20 MB permitidos.";

  const firma = new TextDecoder().decode(await valor.slice(0, 5).arrayBuffer());
  return firma === "%PDF-" ? valor : "El archivo no es un PDF válido.";
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
