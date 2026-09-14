import { createPublicKey, createVerify, type JsonWebKey } from "node:crypto";
import {
  COGNITO_CLIENT_ID,
  emisorCognito,
  urlJwks,
  cognitoConfigurado,
} from "./cognito";

/**
 * Verificación de los JWT que emite Cognito.
 *
 * El token llega en una cookie, así que no basta con leer sus claims: hay que
 * comprobar la firma contra las claves públicas del User Pool (JWKS). De lo
 * contrario, cualquiera podría enviar una cookie fabricada y hacerse pasar por
 * otro bombero ante la interfaz.
 *
 * Verificar localmente evita una llamada a AWS por cada render: el JWKS se
 * descarga una vez y se cachea (las claves de un pool no rotan).
 */

/** Claims que este panel usa del ID token de Cognito. */
export type ClaimsToken = {
  sub: string;
  exp: number;
  iss: string;
  token_use: "id" | "access";
  "cognito:username"?: string;
  "cognito:groups"?: string[];
  email?: string;
  name?: string;
  [clave: string]: unknown;
};

let jwksEnCache: Promise<Map<string, ReturnType<typeof createPublicKey>>> | null =
  null;

/**
 * Verifica firma, emisor, vigencia, tipo y destinatario del token.
 * Devuelve los claims o `null` si el token no es de fiar.
 */
export async function verificarToken(
  token: string,
  tipo: "id" | "access" = "id",
): Promise<ClaimsToken | null> {
  if (!cognitoConfigurado()) return null;

  const partes = token.split(".");
  if (partes.length !== 3) return null;

  const [cabeceraB64, cargaB64, firmaB64] = partes;

  const cabecera = decodificar<{ kid?: string; alg?: string }>(cabeceraB64);
  const claims = decodificar<ClaimsToken>(cargaB64);
  if (!cabecera || !claims) return null;

  // Cognito firma con RS256; aceptar `alg: none` u otro sería una puerta abierta.
  if (cabecera.alg !== "RS256" || !cabecera.kid) return null;

  const claves = await obtenerJwks();
  const clave = claves?.get(cabecera.kid);
  if (!clave) return null;

  const verificador = createVerify("RSA-SHA256");
  verificador.update(`${cabeceraB64}.${cargaB64}`);
  verificador.end();

  if (!verificador.verify(clave, Buffer.from(firmaB64, "base64url"))) {
    return null;
  }

  if (claims.iss !== emisorCognito()) return null;
  if (claims.token_use !== tipo) return null;
  if (expirado(claims)) return null;

  // El ID token nombra al App Client en `aud`; el access token, en `client_id`.
  const destinatario =
    tipo === "id" ? claims.aud : (claims.client_id as string | undefined);
  if (destinatario !== COGNITO_CLIENT_ID) return null;

  return claims;
}

/** Lee los claims SIN verificar la firma. Solo para inspeccionar `exp`. */
export function leerClaims(token: string): ClaimsToken | null {
  const carga = token.split(".")[1];
  return carga ? decodificar<ClaimsToken>(carga) : null;
}

/** `true` si el token ya venció o le queda menos del margen indicado. */
export function expirado(claims: ClaimsToken, margenSegundos = 0): boolean {
  if (typeof claims.exp !== "number") return true;
  return claims.exp * 1000 <= Date.now() + margenSegundos * 1000;
}

/* ---------------------------------------------------------------- */

async function obtenerJwks() {
  jwksEnCache ??= descargarJwks().catch((error) => {
    // Un fallo de red no debe envenenar la caché: se reintenta al siguiente uso.
    jwksEnCache = null;
    throw error;
  });

  return jwksEnCache.catch(() => null);
}

async function descargarJwks() {
  const respuesta = await fetch(urlJwks(), {
    // Las claves del pool son estables; una hora de caché es holgada.
    next: { revalidate: 3600 },
  });

  if (!respuesta.ok) {
    throw new Error(`No se pudo descargar el JWKS (HTTP ${respuesta.status})`);
  }

  const { keys } = (await respuesta.json()) as { keys: JsonWebKey[] };
  const mapa = new Map<string, ReturnType<typeof createPublicKey>>();

  for (const jwk of keys) {
    const kid = (jwk as { kid?: string }).kid;
    if (!kid) continue;
    mapa.set(kid, createPublicKey({ key: jwk, format: "jwk" }));
  }

  return mapa;
}

function decodificar<T>(segmento: string): T | null {
  try {
    return JSON.parse(Buffer.from(segmento, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
