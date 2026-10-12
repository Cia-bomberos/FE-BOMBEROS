import { cache } from "react";
import { apiFetch, type RespuestaApi } from "./api";
import type {
  Documento,
  EnvioExterno,
  EstadoDocumento,
  Etapa,
  Modalidad,
  Prioridad,
  TipoDocumento,
} from "./datos-demo";
import { diasRestantes } from "./plazos";
import { seccionPorClave, type ClaveSeccion } from "./secciones";

/**
 * Repositorio de documentos de la bandeja, respaldado por el microservicio
 * MS-BANDEJA-BOMBEROS (URL del gateway en `bandeja-config.json`, S3).
 *
 * Traduce entre el contrato del backend (snake_case, secciones como
 * "ServicioGeneral", fechas ISO) y el modelo que consumen las vistas. El
 * backend vuelve a validar permisos y transiciones de estado: sus mensajes
 * de rechazo llegan tal cual a la interfaz como `ErrorBandeja`.
 *
 * Los PDF no pasan por el gateway: se pide una URL pre-firmada
 * (`POST /documentos/upload-url`), se sube el archivo directo a S3 y se
 * registra la key resultante.
 */

export class ErrorBandeja extends Error {
  constructor(
    mensaje: string,
    readonly estado: number,
  ) {
    super(mensaje);
    this.name = "ErrorBandeja";
  }
}

/* ---------- Contrato del backend ---------- */

type SeccionApi = "Administracion" | "ServicioGeneral" | "Maquinas" | "Sanidad";

type HistorialApi = {
  accion: string;
  detalle: string | null;
  usuario_nombre: string | null;
  seccion: string | null;
  fecha_hora: string;
};

export type DocumentoApi = {
  id: string;
  codigo_unico: string | null;
  tipo: string | null;
  modalidad: Modalidad;
  estado: EstadoDocumento;
  prioridad: Prioridad;
  prioridad_manual: boolean;
  seccion_origen: SeccionApi;
  seccion_responsable: SeccionApi;
  /** "YYYY-MM-DD" */
  fecha_limite: string;
  archivo_s3_key: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  /** Solo en `GET /documentos/{id}`. */
  historial?: HistorialApi[];
  /* El panel los envía al registrar; el backend aún no los persiste. */
  asunto?: string | null;
  via?: string | null;
  solo_lectura?: boolean;
  vencido?: boolean;
};

/** Secciones que existen en el backend de la bandeja (RN-0004). */
const SECCION_API: Partial<Record<ClaveSeccion, SeccionApi>> = {
  administracion: "Administracion",
  "servicio-general": "ServicioGeneral",
  maquinas: "Maquinas",
  sanidad: "Sanidad",
};

function seccionDesdeApi(seccion: string): ClaveSeccion {
  const clave = (Object.keys(SECCION_API) as ClaveSeccion[]).find(
    (c) => SECCION_API[c] === seccion,
  );
  return clave ?? (seccion as ClaveSeccion);
}

const nombreSeccion = (clave: ClaveSeccion) =>
  seccionPorClave(clave)?.nombre ?? clave;

/* ---------- Lectura ---------- */

/**
 * Documentos que el token del usuario puede ver; el backend ya filtra por
 * sección. `cache` evita repetir la llamada cuando el layout y la página la
 * piden en el mismo render.
 */
export const listarDocumentos = cache(async (): Promise<Documento[]> => {
  const { documentos } = exigir(
    await apiFetch<{ documentos: DocumentoApi[] }>("/documentos", { servicio: "bandeja" }),
  );
  return documentos.map(aDocumento);
});

/**
 * Para vistas secundarias (contador del menú, buscador, KPIs): si la bandeja
 * no responde, no deben tumbar la página que las contiene.
 */
export async function listarDocumentosSiDisponible(): Promise<Documento[]> {
  try {
    return await listarDocumentos();
  } catch {
    return [];
  }
}

/** Detalle con historial. `null` si no existe o es de otra sección (RN-0004). */
export const obtenerDocumento = cache(async (id: string): Promise<Documento | null> => {
  if (!esUuid(id)) return null;

  const respuesta = await apiFetch<DocumentoApi>(`/documentos/${id}`, { servicio: "bandeja" });
  if (!respuesta.ok && respuesta.estado === 404) return null;
  return aDocumento(exigir(respuesta));
});

/** URL pre-firmada (5 min) para descargar el PDF original (RN-0023). */
export async function urlDescarga(id: string): Promise<string> {
  const { downloadUrl } = exigir(
    await apiFetch<{ downloadUrl: string }>(ruta(id, "/descargar"), { servicio: "bandeja" }),
  );
  return downloadUrl;
}

/* ---------- Registro (RF-0004, RN-0007, RN-0013, RN-0024) ---------- */

export type DatosRegistro = {
  /** RN-0024: interno → registro completo; externo → simplificado. */
  procedencia: "interno" | "externo";
  /** Obligatorio para internos; se ignora en externos (RN-0025). */
  tipo?: TipoDocumento;
  asunto: string;
  via: Documento["via"];
  /** "dd/mm/yyyy" */
  plazo: string;
  /** Si viene, prevalece sobre la calculada por plazo. */
  prioridad?: Prioridad;
  archivo: File;
};

/** Prioridad según los días que restan hasta el plazo (RN-0013). */
export function prioridadPorPlazo(plazo: string, hoy: Date): Prioridad {
  const dias = diasRestantes(plazo, hoy);
  if (dias === null || dias < 10) return "Alta";
  if (dias <= 30) return "Media";
  return "Baja";
}

/**
 * Registra el documento en la sección del usuario autenticado (la decide el
 * backend a partir del token). Devuelve el id asignado.
 */
export async function registrarDocumento(datos: DatosRegistro): Promise<string> {
  const archivo_s3_key = await subirPdf(datos.archivo);

  const { id } = exigir(
    await apiFetch<DocumentoApi>("/documentos", {
      metodo: "POST",
      servicio: "bandeja",
      cuerpo: {
        origen: datos.procedencia,
        tipo: datos.procedencia === "interno" ? datos.tipo : undefined,
        fecha_limite: localAIso(datos.plazo),
        prioridad: datos.prioridad,
        archivo_s3_key,
        asunto: datos.asunto,
        via: datos.via,
      },
    }),
  );
  return id;
}

/* ---------- Modificaciones (RF-0004 a RF-0008) ---------- */

/** RN-0009, RN-0015: pasa a "En proceso" y a la sección receptora. */
export async function derivarDocumento(id: string, seccion: ClaveSeccion, nota: string) {
  const destino = SECCION_API[seccion];
  if (!destino) throw new ErrorBandeja("La bandeja no admite esa sección.", 400);

  exigir(
    await apiFetch(ruta(id, "/derivar"), {
      metodo: "PATCH",
      servicio: "bandeja",
      cuerpo: { seccion_destino: destino, nota },
    }),
  );
}

/** RN-0008, RN-0011: desde Pendiente o En proceso. */
export async function marcarAtendido(id: string, nota: string) {
  exigir(
    await apiFetch(ruta(id, "/atender"), { metodo: "PATCH", servicio: "bandeja", cuerpo: { nota } }),
  );
}

/** RN-0018, RF-0005: prioridad manual y/o nuevo plazo ("dd/mm/yyyy"). */
export async function asignarPrioridad(
  id: string,
  cambios: { prioridad?: Prioridad; plazo?: string },
) {
  exigir(
    await apiFetch(ruta(id, "/prioridad"), {
      metodo: "PATCH",
      servicio: "bandeja",
      cuerpo: {
        prioridad: cambios.prioridad,
        fecha_limite: cambios.plazo ? localAIso(cambios.plazo) : undefined,
      },
    }),
  );
}

/** Envío por canal externo: cierra la gestión como Atendido (RN-0021, RN-0022). */
export async function registrarEnvioExterno(id: string, medio: string, destinatario: string) {
  exigir(
    await apiFetch(ruta(id, "/envio-externo"), {
      metodo: "POST",
      servicio: "bandeja",
      cuerpo: { medio, destinatario },
    }),
  );
}

/** RN-0010: solo mientras el documento está "En proceso". */
export async function actualizarAdjunto(id: string, archivo: File) {
  // La ruta se valida antes de subir, para no dejar un PDF huérfano en S3.
  const destino = ruta(id, "/archivo");
  const archivo_s3_key = await subirPdf(archivo);
  exigir(
    await apiFetch(destino, { metodo: "PATCH", servicio: "bandeja", cuerpo: { archivo_s3_key } }),
  );
}

/**
 * Elimina metadata, historial y archivo (RN-0028). Irreversible. El backend
 * lo rechaza mientras no se confirme el respaldo en Google Drive.
 */
export async function eliminarDocumento(id: string) {
  exigir(await apiFetch(ruta(id), { metodo: "DELETE", servicio: "bandeja" }));
}

/* ---------- Subida de archivos ---------- */

const TIEMPO_SUBIDA = 60_000;

async function subirPdf(archivo: File): Promise<string> {
  const { uploadUrl, archivo_s3_key } = exigir(
    await apiFetch<{ uploadUrl: string; archivo_s3_key: string }>("/documentos/upload-url", {
      metodo: "POST",
      servicio: "bandeja",
      cuerpo: { nombre_archivo: archivo.name },
    }),
  );

  let respuesta: Response;
  try {
    // El Content-Type es parte de la firma: debe coincidir exactamente.
    respuesta = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: archivo,
      signal: AbortSignal.timeout(TIEMPO_SUBIDA),
      cache: "no-store",
    });
  } catch {
    throw new ErrorBandeja("No se pudo subir el archivo. Intente nuevamente.", 503);
  }

  if (!respuesta.ok) {
    throw new ErrorBandeja("El almacenamiento rechazó el archivo. Intente nuevamente.", respuesta.status);
  }
  return archivo_s3_key;
}

/* ---------- Traducción del contrato ---------- */

const ETAPAS: Record<string, string> = {
  registro: "Ingreso",
  derivacion: "Derivación",
  actualizacion_archivo: "Archivo adjunto",
  atendido: "Cambio de estado",
  prioridad_manual: "Prioridad",
  envio_externo: "Envío externo",
  descarga: "Descarga",
};

export function aDocumento(api: DocumentoApi): Documento {
  const seccion = seccionDesdeApi(api.seccion_responsable);
  const externo = api.modalidad === "simplificado";
  const trazabilidad = (api.historial ?? []).map(aEtapa);

  return {
    id: api.id,
    numero: api.codigo_unico ?? `Externo ${api.id.slice(0, 8).toUpperCase()}`,
    tipo: (api.tipo ?? "Externo") as Documento["tipo"],
    modalidad: api.modalidad,
    asunto: api.asunto ?? "",
    origen: externo ? "Entidad externa" : nombreSeccion(seccionDesdeApi(api.seccion_origen)),
    destino: nombreSeccion(seccion),
    seccion,
    via: api.via === "Físico" ? "Físico" : "Digital",
    folios: 0,
    fechaIngreso: momentoLima(api.fecha_creacion).fecha,
    plazo: isoALocal(api.fecha_limite),
    estado: api.estado,
    prioridad: api.prioridad,
    prioridadManual: api.prioridad_manual,
    adjunto: api.archivo_s3_key
      ? { nombre: "Documento PDF", tamano: "PDF", actualizado: momentoLima(api.fecha_actualizacion).fecha }
      : undefined,
    envioExterno: envioDesdeHistorial(api.historial ?? []),
    trazabilidad,
    soloLectura: api.solo_lectura ?? false,
  };
}

function aEtapa(h: HistorialApi): Etapa {
  const { fecha, hora } = momentoLima(h.fecha_hora);
  return {
    etapa: ETAPAS[h.accion] ?? h.accion,
    fecha,
    hora,
    responsable: h.usuario_nombre || h.seccion || "Sistema",
    detalle: h.detalle ?? "",
    completada: true,
    seccion: h.seccion ? seccionDesdeApi(h.seccion) : undefined,
  };
}

function envioDesdeHistorial(historial: HistorialApi[]): EnvioExterno | undefined {
  const envio = historial.find((h) => h.accion === "envio_externo");
  if (!envio) return undefined;
  return { ...momentoLima(envio.fecha_hora), medio: "", destinatario: "" };
}

/* ---------- Auxiliares ---------- */

/**
 * Ante un 500 el backend devuelve el texto de la excepción (puede incluir
 * SQL): no se muestra. Los 4xx sí, porque explican la regla incumplida.
 */
function exigir<T>(respuesta: RespuestaApi<T>): T {
  if (respuesta.ok) return respuesta.datos;
  const motivo =
    respuesta.estado === 500
      ? "La bandeja documental no pudo completar la operación. Intente nuevamente."
      : respuesta.motivo;
  throw new ErrorBandeja(motivo, respuesta.estado);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esUuid = (id: string) => UUID.test(id);

/**
 * Ruta de un documento. El backend responde 500 ante un id que no es UUID,
 * así que se corta antes de llamar.
 */
function ruta(id: string, sufijo = ""): string {
  if (!esUuid(id)) throw new ErrorBandeja("Documento no encontrado.", 404);
  return `/documentos/${id}${sufijo}`;
}

const LIMA = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Fecha y hora en Lima de un timestamp del backend. Python lo serializa como
 * "2026-10-04 15:22:10.123456+00:00": espacio en vez de "T" y microsegundos.
 */
function momentoLima(texto: string): { fecha: string; hora: string } {
  const momento = new Date(texto.replace(" ", "T").replace(/(\.\d{3})\d+/, "$1"));
  if (Number.isNaN(momento.getTime())) return { fecha: "", hora: "" };

  const partes = Object.fromEntries(LIMA.formatToParts(momento).map((p) => [p.type, p.value]));
  return {
    fecha: `${partes.day}/${partes.month}/${partes.year}`,
    hora: `${partes.hour}:${partes.minute}`,
  };
}

/** "YYYY-MM-DD" → "dd/mm/yyyy". */
function isoALocal(iso: string): string {
  const [a, m, d] = iso.split("-");
  return a && m && d ? `${d}/${m}/${a}` : "";
}

/** "dd/mm/yyyy" → "YYYY-MM-DD". */
function localAIso(local: string): string {
  const [d, m, a] = local.split("/");
  return `${a}-${m}-${d}`;
}
