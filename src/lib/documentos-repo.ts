import {
  ahoraDemo,
  DOCUMENTOS,
  type Adjunto,
  type Documento,
  type EstadoDocumento,
  type Etapa,
  type Prioridad,
  type TipoDocumento,
} from "./datos-demo";
import { diasRestantes } from "./plazos";
import { seccionPorClave, type ClaveSeccion } from "./secciones";
import type { Bombero } from "./tipos";

/**
 * Repositorio de documentos de la bandeja.
 *
 * Hoy es un almacén en memoria sembrado con los datos de demostración: las
 * Server Actions mutan aquí y las páginas leen de aquí, así que la maqueta
 * se comporta como el sistema real dentro de una misma ejecución del
 * servidor (se reinicia con el proceso).
 *
 * TODO(integración): cada función corresponde a un endpoint del gateway
 * (GET/POST /documentos, POST /documentos/{id}/derivar, …). Las páginas y
 * acciones no cambian: solo el cuerpo de estas funciones.
 */

type Almacen = { documentos: Documento[] };

// En `globalThis` para sobrevivir a la recarga en caliente de `next dev`.
const global = globalThis as unknown as { __f3Documentos?: Almacen };
const almacen: Almacen = (global.__f3Documentos ??= {
  documentos: structuredClone(DOCUMENTOS),
});

const clonar = <T>(valor: T): T => structuredClone(valor);

export async function listarDocumentos(): Promise<Documento[]> {
  return clonar(almacen.documentos);
}

export async function obtenerDocumento(id: string): Promise<Documento | null> {
  const documento = almacen.documentos.find((d) => d.id === id);
  return documento ? clonar(documento) : null;
}

/* ---------- Registro (RF-0003, RF-0004, RN-0007, RN-0013) ---------- */

export type DatosRegistro = {
  tipo: TipoDocumento;
  numero: string;
  asunto: string;
  origen: string;
  destino: string;
  seccion: ClaveSeccion;
  via: Documento["via"];
  folios: number;
  plazo: string;
  /** Si viene, prevalece sobre la calculada por plazo. */
  prioridad?: Prioridad;
  adjunto?: Adjunto;
};

/** Prioridad según los días que restan hasta el plazo (RN-0013). */
export function prioridadPorPlazo(plazo: string, hoy: Date): Prioridad {
  const dias = diasRestantes(plazo, hoy);
  if (dias === null || dias < 10) return "Alta";
  if (dias <= 30) return "Media";
  return "Baja";
}

export async function registrarDocumento(
  datos: DatosRegistro,
  actor: Bombero,
): Promise<Documento> {
  const ahora = ahoraDemo();
  const anio = ahora.getFullYear();
  const id = `${datos.numero.replace(/\D/g, "").padStart(3, "0")}-${anio}`;

  if (almacen.documentos.some((d) => d.id === id)) {
    throw new Error(`Ya existe un documento con el número ${datos.numero}.`);
  }

  const documento: Documento = {
    id,
    numero: `${datos.tipo} N° ${datos.numero}-${anio}`,
    tipo: datos.tipo,
    asunto: datos.asunto,
    origen: datos.origen,
    destino: datos.destino,
    seccion: datos.seccion,
    via: datos.via,
    folios: datos.folios,
    fechaIngreso: fecha(ahora),
    plazo: datos.plazo,
    // Todo documento nace Pendiente (RN-0007).
    estado: "Pendiente",
    prioridad: datos.prioridad ?? prioridadPorPlazo(datos.plazo, ahora),
    prioridadManual: Boolean(datos.prioridad),
    adjunto: datos.adjunto,
    trazabilidad: [
      entrada("Ingreso", actor, `Documento registrado en la Bandeja Documental por vía ${datos.via.toLowerCase()}.`, ahora),
      entrada(
        "Clasificación",
        actor,
        `Prioridad ${datos.prioridad ?? prioridadPorPlazo(datos.plazo, ahora)} · plazo ${datos.plazo} · responsable ${nombreSeccion(datos.seccion)}.`,
        ahora,
      ),
    ],
  };

  almacen.documentos.unshift(documento);
  return clonar(documento);
}

/* ---------- Modificaciones (RF-0005 a RF-0008) ---------- */

export async function derivarDocumento(
  id: string,
  seccion: ClaveSeccion,
  nota: string,
  actor: Bombero,
): Promise<Documento> {
  const documento = buscar(id);
  const desde = nombreSeccion(documento.seccion);
  documento.seccion = seccion;
  if (documento.estado === "Pendiente") documento.estado = "En proceso";
  documento.trazabilidad.push(
    entrada(
      "Derivación",
      actor,
      `Derivado de ${desde} a ${nombreSeccion(seccion)}.${nota ? ` ${nota}` : ""}`,
    ),
  );
  return clonar(documento);
}

export async function cambiarEstado(
  id: string,
  estado: EstadoDocumento,
  nota: string,
  actor: Bombero,
): Promise<Documento> {
  const documento = buscar(id);
  const anterior = documento.estado;
  documento.estado = estado;
  documento.trazabilidad.push(
    entrada(
      estado === "Archivado" ? "Archivo" : "Cambio de estado",
      actor,
      `Estado cambiado de ${anterior} a ${estado}.${nota ? ` ${nota}` : ""}`,
    ),
  );
  return clonar(documento);
}

/** Envío por canal externo: cierra la gestión como Atendido (RN-0021, RN-0022). */
export async function registrarEnvioExterno(
  id: string,
  medio: string,
  destinatario: string,
  actor: Bombero,
): Promise<Documento> {
  const documento = buscar(id);
  const ahora = ahoraDemo();
  documento.envioExterno = { fecha: fecha(ahora), hora: hora(ahora), medio, destinatario };
  documento.estado = "Atendido";
  documento.trazabilidad.push(
    entrada(
      "Envío externo",
      actor,
      `Enviado a ${destinatario} por ${medio}. Gestión cerrada como Atendido.`,
      ahora,
    ),
  );
  return clonar(documento);
}

export async function actualizarAdjunto(
  id: string,
  adjunto: Adjunto,
  actor: Bombero,
): Promise<Documento> {
  const documento = buscar(id);
  const anterior = documento.adjunto?.nombre;
  documento.adjunto = adjunto;
  documento.trazabilidad.push(
    entrada(
      "Archivo adjunto",
      actor,
      anterior
        ? `Adjunto reemplazado: ${anterior} → ${adjunto.nombre} (${adjunto.tamano}).`
        : `Adjunto agregado: ${adjunto.nombre} (${adjunto.tamano}).`,
    ),
  );
  return clonar(documento);
}

/** Elimina metadata, historial y archivo (RN-0028). Irreversible. */
export async function eliminarDocumento(id: string): Promise<void> {
  const indice = almacen.documentos.findIndex((d) => d.id === id);
  if (indice === -1) throw new Error("Documento no encontrado.");
  almacen.documentos.splice(indice, 1);
}

/* ---------- Auxiliares ---------- */

function buscar(id: string): Documento {
  const documento = almacen.documentos.find((d) => d.id === id);
  if (!documento) throw new Error("Documento no encontrado.");
  return documento;
}

function entrada(
  etapa: string,
  actor: Bombero,
  detalle: string,
  momento = ahoraDemo(),
): Etapa {
  return {
    etapa,
    fecha: fecha(momento),
    hora: hora(momento),
    responsable: `${actor.grado.replace(" CBP", "")} ${actor.nombre}`,
    detalle,
    completada: true,
  };
}

const nombreSeccion = (clave: ClaveSeccion) =>
  seccionPorClave(clave)?.nombre ?? clave;

const dos = (n: number) => String(n).padStart(2, "0");
const fecha = (d: Date) => `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`;
const hora = (d: Date) => `${dos(d.getHours())}:${dos(d.getMinutes())}`;
