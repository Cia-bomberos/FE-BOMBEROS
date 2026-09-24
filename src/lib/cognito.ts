import { createHmac } from "node:crypto";

/**
 * Cliente del User Pool de Amazon Cognito.
 *
 * Se habla directamente con la API REST de Cognito Identity Provider desde el
 * servidor (Server Actions), sin SDK ni dependencias: son peticiones JSON con
 * la cabecera `X-Amz-Target`. La contraseña nunca llega al navegador y los
 * tokens se guardan en cookies httpOnly (ver `sesion.ts`).
 *
 * Requiere que el App Client tenga habilitado ALLOW_USER_PASSWORD_AUTH y
 * ALLOW_REFRESH_TOKEN_AUTH.
 */

export const COGNITO_REGION = process.env.COGNITO_REGION ?? "";
export const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? "";
export const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID ?? "";

/** Solo si el App Client se creó como confidencial (con secreto). */
const COGNITO_CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET ?? "";

const TIEMPO_LIMITE = 10_000;

export function cognitoConfigurado(): boolean {
  return Boolean(COGNITO_REGION && COGNITO_USER_POOL_ID && COGNITO_CLIENT_ID);
}

/** Emisor que deben declarar los tokens del pool (claim `iss`). */
export function emisorCognito(): string {
  return `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;
}

/** Claves públicas con las que Cognito firma los tokens. */
export function urlJwks(): string {
  return `${emisorCognito()}/.well-known/jwks.json`;
}

export type TokensCognito = {
  idToken: string;
  accessToken: string;
  /** Ausente al renovar: Cognito no reemite el refresh token. */
  refreshToken?: string;
  /** Vigencia en segundos que informa Cognito. */
  expiraEn: number;
};

export type ResultadoCognito =
  | { estado: "ok"; tokens: TokensCognito }
  /** Usuario creado por la Jefatura que aún usa su contraseña temporal. */
  | { estado: "reto-nueva-clave"; sesion: string; usuario: string }
  | { estado: "error"; motivo: string; sinConfigurar?: boolean };

/* ---------------------------------------------------------------- */
/* Operaciones                                                        */
/* ---------------------------------------------------------------- */

/** Autentica con usuario y contraseña (flujo USER_PASSWORD_AUTH). */
export async function iniciarSesion(
  usuario: string,
  clave: string,
): Promise<ResultadoCognito> {
  return llamar("InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: COGNITO_CLIENT_ID,
    AuthParameters: limpiar({
      USERNAME: usuario,
      PASSWORD: clave,
      SECRET_HASH: hashSecreto(usuario),
    }),
  });
}

/**
 * Completa el reto NEW_PASSWORD_REQUIRED estableciendo la contraseña
 * definitiva del bombero. `usuario` debe ser el que devolvió el reto.
 */
export async function establecerNuevaClave(
  usuario: string,
  sesion: string,
  nuevaClave: string,
): Promise<ResultadoCognito> {
  return llamar("RespondToAuthChallenge", {
    ChallengeName: "NEW_PASSWORD_REQUIRED",
    ClientId: COGNITO_CLIENT_ID,
    Session: sesion,
    ChallengeResponses: limpiar({
      USERNAME: usuario,
      NEW_PASSWORD: nuevaClave,
      SECRET_HASH: hashSecreto(usuario),
    }),
  });
}

/** Renueva el par de tokens con el refresh token (no reemite refresh). */
export async function renovarSesion(
  refreshToken: string,
  usuario: string,
): Promise<ResultadoCognito> {
  return llamar("InitiateAuth", {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: COGNITO_CLIENT_ID,
    AuthParameters: limpiar({
      REFRESH_TOKEN: refreshToken,
      SECRET_HASH: hashSecreto(usuario),
    }),
  });
}

/** Invalida todos los tokens del usuario. Los fallos se ignoran a propósito. */
export async function cerrarSesionCognito(accessToken: string): Promise<void> {
  await llamar("GlobalSignOut", { AccessToken: accessToken });
}

/* ---------------------------------------------------------------- */
/* Transporte                                                         */
/* ---------------------------------------------------------------- */

async function llamar(
  accion: string,
  cuerpo: Record<string, unknown>,
): Promise<ResultadoCognito> {
  if (!cognitoConfigurado()) {
    return {
      estado: "error",
      sinConfigurar: true,
      motivo:
        "El servicio de autenticación aún no está configurado. Defina las variables de Cognito.",
    };
  }

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_LIMITE);

  try {
    const respuesta = await fetch(
      `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-amz-json-1.1",
          "X-Amz-Target": `AWSCognitoIdentityProviderService.${accion}`,
        },
        body: JSON.stringify(cuerpo),
        signal: control.signal,
        cache: "no-store",
      },
    );

    const datos = (await respuesta.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!respuesta.ok) {
      const tipo = String(datos?.__type ?? "");
      if (tipo.includes("ResourceNotFound") || tipo.includes("InvalidParameter")) {
        console.error(`[cognito] ${accion}: ${tipo} — ${datos?.message ?? ""}`);
      }
      return { estado: "error", motivo: traducirError(datos) };
    }

    return interpretar(datos ?? {});
  } catch (error) {
    const abortado = error instanceof Error && error.name === "AbortError";
    return {
      estado: "error",
      motivo: abortado
        ? "Cognito no respondió a tiempo. Intente nuevamente."
        : "No se pudo contactar al servicio de autenticación.",
    };
  } finally {
    clearTimeout(temporizador);
  }
}

function interpretar(datos: Record<string, unknown>): ResultadoCognito {
  const reto = datos.ChallengeName;

  if (reto === "NEW_PASSWORD_REQUIRED") {
    const parametros = (datos.ChallengeParameters ?? {}) as Record<
      string,
      string
    >;
    return {
      estado: "reto-nueva-clave",
      sesion: String(datos.Session ?? ""),
      // Cognito exige responder con este identificador, no con lo que se tecleó.
      usuario: parametros.USER_ID_FOR_SRP ?? parametros.USERNAME ?? "",
    };
  }

  if (typeof reto === "string" && reto) {
    // MFA u otros retos que este frontend todavía no implementa.
    return {
      estado: "error",
      motivo: `Su cuenta requiere un paso adicional de verificación (${reto}) que aún no está habilitado en esta plataforma.`,
    };
  }

  const autenticacion = datos.AuthenticationResult as
    | Record<string, unknown>
    | undefined;

  const idToken = String(autenticacion?.IdToken ?? "");
  const accessToken = String(autenticacion?.AccessToken ?? "");

  if (!idToken || !accessToken) {
    return {
      estado: "error",
      motivo: "La respuesta de Cognito no incluyó los tokens de sesión.",
    };
  }

  return {
    estado: "ok",
    tokens: {
      idToken,
      accessToken,
      refreshToken: autenticacion?.RefreshToken
        ? String(autenticacion.RefreshToken)
        : undefined,
      expiraEn: Number(autenticacion?.ExpiresIn ?? 3600),
    },
  };
}

/* ---------------------------------------------------------------- */
/* Auxiliares                                                         */
/* ---------------------------------------------------------------- */

/**
 * Firma que exige Cognito cuando el App Client tiene secreto:
 * base64( HMAC-SHA256( usuario + clientId, clientSecret ) ).
 */
function hashSecreto(usuario: string): string | undefined {
  if (!COGNITO_CLIENT_SECRET) return undefined;

  return createHmac("sha256", COGNITO_CLIENT_SECRET)
    .update(usuario + COGNITO_CLIENT_ID)
    .digest("base64");
}

/** Quita las claves sin valor para no enviar `undefined` a Cognito. */
function limpiar(objeto: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(objeto).filter(([, valor]) => valor !== undefined),
  );
}

/**
 * Traduce los errores de Cognito. Usuario inexistente y contraseña errada
 * comparten mensaje a propósito: revelar cuál falló permitiría averiguar
 * qué códigos institucionales existen.
 */
function traducirError(datos: Record<string, unknown> | null): string {
  const tipo = String(datos?.__type ?? "").split("#").pop() ?? "";

  switch (tipo) {
    case "NotAuthorizedException":
    case "UserNotFoundException":
      return "Credenciales incorrectas. Verifique su usuario y contraseña.";
    case "UserNotConfirmedException":
      return "Su cuenta aún no ha sido confirmada. Comuníquese con la Jefatura.";
    case "PasswordResetRequiredException":
      return "Debe restablecer su contraseña antes de ingresar.";
    case "InvalidPasswordException":
      return "La contraseña no cumple la política de seguridad de la Compañía.";
    case "TooManyRequestsException":
    case "TooManyFailedAttemptsException":
    case "LimitExceededException":
      return "Demasiados intentos. Espere unos minutos antes de reintentar.";
    case "ExpiredCodeException":
    case "CodeMismatchException":
      return "La sesión de cambio de contraseña expiró. Vuelva a ingresar.";
    // Los dos siguientes solo aparecen si el User Pool está mal configurado;
    // el mensaje apunta a la causa en vez de culpar al usuario.
    case "ResourceNotFoundException":
      return "El User Pool o el App Client indicados no existen. Revise las variables de Cognito.";
    case "InvalidParameterException":
      return "No se pudo iniciar el flujo de autenticación. Verifique que el App Client tenga habilitado USER_PASSWORD_AUTH.";
    default:
      return "No se pudo completar el acceso. Intente nuevamente.";
  }
}
