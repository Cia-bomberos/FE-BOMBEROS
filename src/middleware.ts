import { NextResponse, type NextRequest } from "next/server";

/**
 * Renovación transparente de la sesión de Cognito.
 *
 * Los tokens de identidad y acceso duran 15 minutos (App Client del
 * backend). Sin este paso, un bombero quedaría fuera del panel a mitad de
 * guardia. El middleware es el
 * único lugar del App Router donde se pueden escribir cookies antes de que se
 * renderice la página, así que aquí se cambia el refresh token por un par
 * nuevo cuando al actual le queda poco.
 *
 * Corre en el runtime Edge: sin `node:crypto`, se usan `atob` y WebCrypto.
 * La verificación criptográfica completa del token sigue haciéndose en el
 * servidor, en `src/lib/jwt.ts`; aquí solo se lee `exp` para decidir.
 */

const COOKIE_ID = "f3_id";
const COOKIE_ACCESO = "f3_ac";
const COOKIE_REFRESCO = "f3_rf";

/** Margen para renovar antes de que el token realmente venza. */
const MARGEN_SEGUNDOS = 120;

export const config = {
  // Solo el panel: el login y los recursos estáticos no necesitan sesión.
  matcher: ["/panel/:path*"],
};

export async function middleware(peticion: NextRequest) {
  const idToken = peticion.cookies.get(COOKIE_ID)?.value;
  const refreshToken = peticion.cookies.get(COOKIE_REFRESCO)?.value;

  // Sin material de sesión no hay nada que renovar: que decida el layout.
  if (!idToken) return NextResponse.next();

  const claims = leerClaims(idToken);
  const vigente =
    typeof claims?.exp === "number" &&
    claims.exp * 1000 > Date.now() + MARGEN_SEGUNDOS * 1000;

  if (vigente) return NextResponse.next();

  if (!refreshToken) return alLogin(peticion);

  const usuario =
    (claims?.["cognito:username"] as string | undefined) ??
    (claims?.sub as string | undefined) ??
    "";

  const tokens = await renovar(refreshToken, usuario);
  if (!tokens) return alLogin(peticion);

  const respuesta = NextResponse.next();
  // Misma vida que el refresh token del App Client (1 día); ver `sesion.ts`.
  const vidaCookie = peticion.cookies.get(COOKIE_REFRESCO)
    ? 60 * 60 * 24
    : undefined;

  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: vidaCookie,
  };

  respuesta.cookies.set(COOKIE_ID, tokens.idToken, base);
  respuesta.cookies.set(COOKIE_ACCESO, tokens.accessToken, base);

  return respuesta;
}

/* ---------------------------------------------------------------- */

async function renovar(refreshToken: string, usuario: string) {
  const region = process.env.COGNITO_REGION ?? "";
  const clientId = process.env.COGNITO_CLIENT_ID ?? "";
  if (!region || !clientId) return null;

  const secretHash = await hashSecreto(usuario, clientId);

  try {
    const respuesta = await fetch(
      `https://cognito-idp.${region}.amazonaws.com/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-amz-json-1.1",
          "X-Amz-Target":
            "AWSCognitoIdentityProviderService.InitiateAuth",
        },
        body: JSON.stringify({
          AuthFlow: "REFRESH_TOKEN_AUTH",
          ClientId: clientId,
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
            ...(secretHash && { SECRET_HASH: secretHash }),
          },
        }),
        cache: "no-store",
      },
    );

    if (!respuesta.ok) return null;

    const datos = (await respuesta.json()) as {
      AuthenticationResult?: { IdToken?: string; AccessToken?: string };
    };

    const idToken = datos.AuthenticationResult?.IdToken;
    const accessToken = datos.AuthenticationResult?.AccessToken;

    return idToken && accessToken ? { idToken, accessToken } : null;
  } catch {
    return null;
  }
}

function alLogin(peticion: NextRequest) {
  const destino = new URL("/login", peticion.url);
  const respuesta = NextResponse.redirect(destino);

  // La sesión ya no sirve: se limpia para no reintentar en cada navegación.
  for (const cookie of [COOKIE_ID, COOKIE_ACCESO, COOKIE_REFRESCO]) {
    respuesta.cookies.delete(cookie);
  }

  return respuesta;
}

/** Lee los claims sin verificar la firma: solo sirve para consultar `exp`. */
function leerClaims(token: string): Record<string, unknown> | null {
  const carga = token.split(".")[1];
  if (!carga) return null;

  try {
    const base64 = carga.replace(/-/g, "+").replace(/_/g, "/");
    const relleno = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const binario = atob(relleno);
    const bytes = Uint8Array.from(binario, (caracter) =>
      caracter.charCodeAt(0),
    );
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/** SECRET_HASH de Cognito, solo si el App Client tiene secreto. */
async function hashSecreto(usuario: string, clientId: string) {
  const secreto = process.env.COGNITO_CLIENT_SECRET ?? "";
  if (!secreto) return null;

  const codificador = new TextEncoder();
  const clave = await crypto.subtle.importKey(
    "raw",
    codificador.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const firma = await crypto.subtle.sign(
    "HMAC",
    clave,
    codificador.encode(usuario + clientId),
  );

  return btoa(String.fromCharCode(...new Uint8Array(firma)));
}
