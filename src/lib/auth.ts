import {
  establecerNuevaClave as establecerNuevaClaveCognito,
  iniciarSesion,
  type ResultadoCognito,
} from "./cognito";
import { verificarToken } from "./jwt";
import {
  crearSesion,
  descartarReto,
  guardarReto,
  obtenerReto,
} from "./sesion";
import { bomberoDesdeClaims, type Bombero } from "./tipos";

/**
 * Orquesta el acceso: habla con Cognito y, si la autenticación prospera,
 * abre la sesión con los tokens recibidos.
 *
 * El frontend nunca compara contraseñas ni las almacena; solo las reenvía a
 * Cognito por TLS y se queda con los tokens resultantes.
 */

export type ResultadoAcceso =
  | { estado: "ok"; bombero: Bombero }
  /** Primer ingreso: el bombero debe reemplazar su contraseña temporal. */
  | { estado: "nueva-clave-requerida" }
  | { estado: "error"; motivo: string; sinConfigurar?: boolean };

/** Paso 1: usuario y contraseña. */
export async function acceder(
  usuario: string,
  clave: string,
  recordar: boolean,
): Promise<ResultadoAcceso> {
  const resultado = await iniciarSesion(usuario, clave);

  if (resultado.estado === "reto-nueva-clave") {
    // La sesión del reto queda en una cookie efímera: es una credencial
    // intermedia y no tiene por qué pasar por el navegador en claro.
    await guardarReto({
      usuario: resultado.usuario || usuario,
      sesion: resultado.sesion,
    });
    return { estado: "nueva-clave-requerida" };
  }

  return cerrarAcceso(resultado, recordar);
}

/** Paso 2 (solo en el primer ingreso): contraseña definitiva. */
export async function definirClaveDefinitiva(
  nuevaClave: string,
  recordar: boolean,
): Promise<ResultadoAcceso> {
  const reto = await obtenerReto();

  if (!reto) {
    return {
      estado: "error",
      motivo:
        "La sesión de cambio de contraseña expiró. Vuelva a ingresar con su contraseña temporal.",
    };
  }

  const resultado = await establecerNuevaClaveCognito(
    reto.usuario,
    reto.sesion,
    nuevaClave,
  );

  if (resultado.estado === "error") {
    // Cognito invalida la sesión del reto tras un intento fallido de política.
    await descartarReto();
    return { estado: "error", motivo: resultado.motivo };
  }

  return cerrarAcceso(resultado, recordar);
}

/* ---------------------------------------------------------------- */

/** Valida los tokens recibidos, abre la sesión y devuelve el perfil. */
async function cerrarAcceso(
  resultado: ResultadoCognito,
  recordar: boolean,
): Promise<ResultadoAcceso> {
  if (resultado.estado === "error") {
    return {
      estado: "error",
      motivo: resultado.motivo,
      sinConfigurar: resultado.sinConfigurar,
    };
  }

  if (resultado.estado !== "ok") {
    return {
      estado: "error",
      motivo: "Su cuenta requiere un paso adicional que no está habilitado.",
    };
  }

  // Se verifica el token recién emitido antes de confiar en él: si el pool o
  // el App Client están mal configurados, es preferible fallar aquí.
  const claims = await verificarToken(resultado.tokens.idToken, "id");

  if (!claims) {
    return {
      estado: "error",
      motivo:
        "El token recibido no pudo ser validado. Revise la configuración del User Pool.",
    };
  }

  await crearSesion(resultado.tokens, recordar);

  return { estado: "ok", bombero: bomberoDesdeClaims(claims) };
}
