import { obtenerConfigBandeja, obtenerConfigRemota } from "./config-remote";
import { obtenerTokenApi } from "./sesion";

/**
 * Cliente del API Gateway de la Compañía.
 *
 * Cada petición viaja con el token de Cognito en `Authorization`; el
 * authorizer del gateway lo verifica contra el User Pool antes de dejar pasar
 * la llamada al backend. Este módulo no decide permisos: solo transporta.
 *
 * La URL se inyecta por entorno. Mientras `API_GATEWAY_URL` esté vacía, las
 * llamadas fallan de forma controlada (`sinConfigurar`) en lugar de romper el
 * render.
 */

/** Quita las barras finales sin regex (evita backtracking en la URL). */
function sinBarrasFinales(url: string): string {
  let fin = url.length;
  while (fin > 0 && url[fin - 1] === "/") fin--;
  return url.slice(0, fin);
}

export const API_URL = sinBarrasFinales(process.env.API_GATEWAY_URL ?? "");

/** Clave de API opcional (header `x-api-key` del gateway). */
const API_KEY = process.env.API_GATEWAY_KEY ?? "";

const TIEMPO_LIMITE = 10_000;

export type Servicio = "seguridad" | "bandeja";

/** Mensaje cuando no hay URL de destino para el servicio. */
const SIN_CONFIGURAR: Record<Servicio, string> = {
  seguridad: "El API Gateway aún no está configurado. Defina API_GATEWAY_URL.",
  bandeja:
    "No se pudo leer la configuración de la Bandeja Documental (bandeja-config.json en S3).",
};

export function apiConfigurada(): boolean {
  return API_URL.length > 0;
}

/**
 * URL del gateway de destino.
 *
 * Seguridad sale de la misma configuración remota que `cognito.ts` usa para
 * el login: si cada uno leyera una fuente distinta, los tokens de un pool
 * llegarían a un gateway que confía en otro (401).
 *
 * La bandeja sale solo del `bandeja-config.json` que publica su propio
 * deploy; no hay variable de entorno de respaldo.
 */
async function urlDe(servicio: Servicio): Promise<string> {
  if (servicio === "bandeja") {
    const config = await obtenerConfigBandeja();
    return config ? sinBarrasFinales(config.apiUrl) : "";
  }
  const { apiUrl } = await obtenerConfigRemota();
  return apiUrl ? sinBarrasFinales(apiUrl) : API_URL;
}

export type RespuestaApi<T> =
  | { ok: true; datos: T }
  | { ok: false; estado: number; motivo: string; sinConfigurar?: boolean };

type OpcionesApi = {
  metodo?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  cuerpo?: unknown;
  cabeceras?: Record<string, string>;
  /** Omite el token: solo para endpoints públicos del gateway. */
  sinAutenticar?: boolean;
  /** Gateway de destino; por defecto el de seguridad. */
  servicio?: Servicio;
};

/**
 * Ejecuta una petición contra el gateway y normaliza el resultado.
 * Nunca lanza: todo error (red, timeout, 4xx/5xx) vuelve como `ok: false`.
 */
export async function apiFetch<T>(
  ruta: string,
  opciones: OpcionesApi = {},
): Promise<RespuestaApi<T>> {
  const {
    metodo = "GET",
    cuerpo,
    cabeceras,
    sinAutenticar = false,
    servicio = "seguridad",
  } = opciones;
  const url = await urlDe(servicio);

  if (!url) {
    return {
      ok: false,
      estado: 0,
      sinConfigurar: true,
      motivo: SIN_CONFIGURAR[servicio],
    };
  }

  const token = sinAutenticar ? null : await obtenerTokenApi();

  if (!sinAutenticar && !token) {
    return { ok: false, estado: 401, motivo: "Su sesión no está activa." };
  }

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_LIMITE);

  try {
    const respuesta = await fetch(`${url}${ruta}`, {
      method: metodo,
      headers: cabecerasDePeticion(cuerpo, token, servicio, cabeceras),
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal: control.signal,
      cache: "no-store",
    });

    const resultado = await procesarRespuesta<T>(respuesta);
    // El detalle de un 5xx no llega a la interfaz, pero queda en el log del servidor.
    if (!resultado.ok && resultado.estado >= 500) {
      const tipo = respuesta.headers.get("x-amzn-errortype") ?? "-";
      console.error(
        `[${servicio}] ${metodo} ${ruta} → ${resultado.estado} (${tipo}): ${resultado.motivo}`,
      );
    }
    return resultado;
  } catch (error) {
    const abortado = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      estado: abortado ? 408 : 503,
      motivo: abortado
        ? "El servidor no respondió a tiempo. Intente nuevamente."
        : "No se pudo contactar al servidor. Verifique su conexión.",
    };
  } finally {
    clearTimeout(temporizador);
  }
}

function cabecerasDePeticion(
  cuerpo: unknown,
  token: string | null,
  servicio: Servicio,
  cabeceras?: Record<string, string>,
): Record<string, string> {
  return {
    Accept: "application/json",
    ...(cuerpo !== undefined && { "Content-Type": "application/json" }),
    ...(token && { Authorization: token }),
    // La clave pertenece al gateway de seguridad; no se reenvía a otros.
    ...(API_KEY && servicio === "seguridad" && { "x-api-key": API_KEY }),
    ...cabeceras,
  };
}

async function procesarRespuesta<T>(respuesta: Response): Promise<RespuestaApi<T>> {
  const texto = await respuesta.text();
  const datos = texto ? seguroJson(texto) : null;

  if (!respuesta.ok) {
    return {
      ok: false,
      estado: respuesta.status,
      motivo: mensajeDeError(datos, respuesta.status),
    };
  }

  return { ok: true, datos: datos as T };
}

function seguroJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

/** Extrae el mensaje del backend; si no lo hay, usa uno genérico por código. */
function mensajeDeError(datos: unknown, estado: number): string {
  if (datos && typeof datos === "object") {
    const cuerpo = datos as Record<string, unknown>;
    for (const clave of ["mensaje", "message", "error", "detail"]) {
      const valor = cuerpo[clave];
      if (typeof valor === "string" && valor.trim()) return valor;
    }
  }

  if (estado === 401) return "Su sesión expiró. Vuelva a ingresar.";
  if (estado === 403) return "No tiene permisos para esta operación.";
  if (estado === 429) {
    return "Demasiadas solicitudes. Espere unos segundos e intente de nuevo.";
  }
  return "No se pudo completar la operación. Intente nuevamente.";
}
