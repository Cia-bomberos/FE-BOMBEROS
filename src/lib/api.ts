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

export const API_URL = (process.env.API_GATEWAY_URL ?? "").replace(/\/+$/, "");

/** Clave de API opcional (header `x-api-key` del gateway). */
const API_KEY = process.env.API_GATEWAY_KEY ?? "";

const TIEMPO_LIMITE = 10_000;

export function apiConfigurada(): boolean {
  return API_URL.length > 0;
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
};

/**
 * Ejecuta una petición contra el gateway y normaliza el resultado.
 * Nunca lanza: todo error (red, timeout, 4xx/5xx) vuelve como `ok: false`.
 */
export async function apiFetch<T>(
  ruta: string,
  opciones: OpcionesApi = {},
): Promise<RespuestaApi<T>> {
  if (!apiConfigurada()) {
    return {
      ok: false,
      estado: 0,
      sinConfigurar: true,
      motivo: "El API Gateway aún no está configurado. Defina API_GATEWAY_URL.",
    };
  }

  const { metodo = "GET", cuerpo, cabeceras, sinAutenticar = false } = opciones;
  const token = sinAutenticar ? null : await obtenerTokenApi();

  if (!sinAutenticar && !token) {
    return { ok: false, estado: 401, motivo: "Su sesión no está activa." };
  }

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_LIMITE);

  try {
    const respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers: {
        Accept: "application/json",
        ...(cuerpo !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(API_KEY && { "x-api-key": API_KEY }),
        ...cabeceras,
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal: control.signal,
      cache: "no-store",
    });

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
