import { apiFetch, type RespuestaApi } from "./api";
import { ROLES, ROLES_ADMINISTRABLES, type ClaveRol } from "./roles";

/**
 * Cliente del módulo Admin del backend (`backend/modulo_admin/handler.py`).
 *
 * Dos endpoints, ambos exclusivos de Jefatura (RN-0042, RN-0043):
 *   GET   /admin/cuentas                → cuentas compartidas administrables
 *   PATCH /admin/cuentas/{id}/password  → nueva contraseña de una de ellas
 *
 * La cuenta de Jefatura nunca aparece en la lista ni puede modificarse desde
 * aquí; el backend lo vuelve a comprobar con el token.
 */

/** Cuenta tal como la devuelve el backend. */
export type CuentaCompartida = {
  username: string;
  nombre: string | null;
  grupo: ClaveRol;
  /** `UserStatus` de Cognito: CONFIRMED, FORCE_CHANGE_PASSWORD… */
  estado: string;
};

export async function listarCuentas(): Promise<RespuestaApi<CuentaCompartida[]>> {
  const respuesta = await apiFetch<{ cuentas: CuentaCompartida[] }>("/admin/cuentas");
  if (!respuesta.ok) return respuesta;

  // Mismo orden que el catálogo de roles, para que la vista sea estable.
  const orden = ROLES_ADMINISTRABLES;
  const cuentas = [...respuesta.datos.cuentas].sort(
    (a, b) => orden.indexOf(a.grupo) - orden.indexOf(b.grupo),
  );
  return { ok: true, datos: cuentas };
}

export async function cambiarPasswordCuenta(
  username: string,
  nuevaPassword: string,
): Promise<RespuestaApi<{ mensaje: string }>> {
  return apiFetch<{ mensaje: string }>(
    `/admin/cuentas/${encodeURIComponent(username)}/password`,
    { metodo: "PATCH", cuerpo: { nueva_password: nuevaPassword } },
  );
}

/**
 * Las cuatro cuentas según el catálogo local, para mostrar el panel cuando
 * el gateway todavía no responde (sin `API_GATEWAY_URL` o sin red).
 */
export function cuentasDelCatalogo(): CuentaCompartida[] {
  return ROLES.filter((rol) => ROLES_ADMINISTRABLES.includes(rol.clave)).map(
    (rol) => ({
      username: rol.usuario,
      nombre: rol.cargo,
      grupo: rol.clave,
      estado: "DESCONOCIDO",
    }),
  );
}

/**
 * Política de contraseñas del User Pool (`backend/serverless.yml`): mínimo 8,
 * con mayúscula, minúscula y número; los símbolos son opcionales. Devuelve
 * el motivo del rechazo o `null` si cumple.
 */
export function validarPolitica(clave: string): string | null {
  if (clave.length < 8) return "Debe tener al menos 8 caracteres.";
  if (!/[a-z]/.test(clave)) return "Debe incluir al menos una minúscula.";
  if (!/[A-Z]/.test(clave)) return "Debe incluir al menos una mayúscula.";
  if (!/[0-9]/.test(clave)) return "Debe incluir al menos un número.";
  return null;
}
