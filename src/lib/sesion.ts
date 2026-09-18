import { cache } from "react";
import { cookies } from "next/headers";
import { cerrarSesionCognito, type TokensCognito } from "./cognito";
import { verificarToken } from "./jwt";
import { COOKIE_TEMA, TEMA_POR_DEFECTO } from "./tema";
import { bomberoDesdeClaims, type Bombero } from "./tipos";

/**
 * Sesión respaldada por los tokens de Cognito.
 *
 * Los tres tokens viajan en cookies httpOnly: el JavaScript del navegador no
 * puede leerlos, lo que los deja fuera del alcance de un XSS. El perfil se
 * deriva del ID token verificado; el access token se envía al API Gateway,
 * que lo valida contra el mismo User Pool (ver el diagrama de arquitectura).
 */

export const COOKIES = {
  id: "f3_id",
  acceso: "f3_ac",
  refresco: "f3_rf",
  /** Reto NEW_PASSWORD_REQUIRED en curso; efímero. */
  reto: "f3_reto",
} as const;

/**
 * Vigencia del refresh token: `RefreshTokenValidity: 1` (día) en el App
 * Client de `backend/serverless.yml`. Una cookie más larga no serviría de
 * nada, porque Cognito rechazaría el refresh vencido.
 */
const DURACION_REFRESCO = 60 * 60 * 24; // 1 día

/** Sin «Mantener sesión en este equipo»: una guardia. */
const DURACION_GUARDIA = 60 * 60 * 8;

/** El reto de contraseña dura lo mismo que la sesión de Cognito (~3 min). */
const DURACION_RETO = 5 * 60;

const BASE = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
} as const;

export async function crearSesion(tokens: TokensCognito, recordar = false) {
  const almacen = await cookies();
  const vidaRefresco = recordar ? DURACION_REFRESCO : DURACION_GUARDIA;

  // Las tres cookies caducan junto con el refresh token, no a la hora de vida
  // del ID token: lo que decide la validez es el claim `exp` del propio JWT,
  // que se verifica en cada uso. Mantenerlas vivas le permite al middleware
  // leer de quién era la sesión para renovarla.
  almacen.set(COOKIES.id, tokens.idToken, { ...BASE, maxAge: vidaRefresco });
  almacen.set(COOKIES.acceso, tokens.accessToken, {
    ...BASE,
    maxAge: vidaRefresco,
  });

  if (tokens.refreshToken) {
    almacen.set(COOKIES.refresco, tokens.refreshToken, {
      ...BASE,
      maxAge: vidaRefresco,
    });
  }

  almacen.delete(COOKIES.reto);

  // Cada sesión arranca con el tema por defecto: la preferencia del toggle
  // dura lo que dure la sesión, no se hereda entre ingresos. La cookie no es
  // httpOnly porque el botón del header la reescribe desde el cliente.
  almacen.set(COOKIE_TEMA, TEMA_POR_DEFECTO, {
    ...BASE,
    httpOnly: false,
    maxAge: vidaRefresco,
  });
}

export async function cerrarSesion() {
  const almacen = await cookies();
  const accessToken = almacen.get(COOKIES.acceso)?.value;

  for (const nombre of Object.values(COOKIES)) {
    almacen.delete(nombre);
  }

  // Revoca el refresh token en Cognito para que la sesión no reviva.
  if (accessToken) {
    await cerrarSesionCognito(accessToken);
  }
}

/** Token que se envía al API Gateway. */
export async function obtenerTokenApi(): Promise<string | null> {
  const almacen = await cookies();
  const cookie =
    process.env.API_GATEWAY_TOKEN === "id" ? COOKIES.id : COOKIES.acceso;
  return almacen.get(cookie)?.value ?? null;
}

/**
 * Recupera al bombero de la sesión verificando la firma del ID token.
 * Devuelve `null` si no hay cookie o el token no es válido o venció.
 *
 * `cache` deduplica el trabajo dentro de una misma petición: aunque varios
 * componentes la invoquen, el token se verifica una sola vez.
 *
 * La renovación con el refresh token ocurre en `src/middleware.ts`, porque un
 * Server Component no puede escribir cookies durante el render.
 */
export const obtenerSesion = cache(async (): Promise<Bombero | null> => {
  const almacen = await cookies();
  const idToken = almacen.get(COOKIES.id)?.value;
  if (!idToken) return null;

  const claims = await verificarToken(idToken, "id");
  return claims ? bomberoDesdeClaims(claims) : null;
});

/* ---------- Reto de contraseña definitiva ---------- */

export type RetoPendiente = { usuario: string; sesion: string };

export async function guardarReto(reto: RetoPendiente) {
  const almacen = await cookies();
  almacen.set(COOKIES.reto, JSON.stringify(reto), {
    ...BASE,
    maxAge: DURACION_RETO,
  });
}

export async function obtenerReto(): Promise<RetoPendiente | null> {
  const almacen = await cookies();
  const crudo = almacen.get(COOKIES.reto)?.value;
  if (!crudo) return null;

  try {
    const reto = JSON.parse(crudo) as RetoPendiente;
    return reto.usuario && reto.sesion ? reto : null;
  } catch {
    return null;
  }
}

export async function descartarReto() {
  const almacen = await cookies();
  almacen.delete(COOKIES.reto);
}
