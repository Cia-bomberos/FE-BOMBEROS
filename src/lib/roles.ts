import type { Bombero } from "./tipos";

/**
 * Roles del sistema, tal como existen en el User Pool de Cognito.
 *
 * Son los cinco grupos que declara `backend/serverless.yml`. Las cuentas son
 * fijas y compartidas por sección (RN-0042): no hay registro de usuarios, y
 * solo Jefatura puede cambiar la contraseña de las otras cuatro (RN-0043).
 * El rol de un usuario es el grupo `cognito:groups` de su ID token.
 */

export type ClaveRol =
  | "Jefatura"
  | "Jefe_Administracion"
  | "Jefe_ServicioGeneral"
  | "Jefe_Maquinas"
  | "Jefe_Sanidad";

export type Rol = {
  /** Nombre exacto del grupo en Cognito. */
  clave: ClaveRol;
  /** Cargo que se muestra en el panel. */
  cargo: string;
  /** Sección de la que es responsable; Jefatura no tiene una en particular. */
  seccion: string;
  /** Username de la cuenta compartida (`backend/scripts/seed_users.py`). */
  usuario: string;
  descripcion: string;
};

export const ROLES: Rol[] = [
  {
    clave: "Jefatura",
    cargo: "Jefatura",
    seccion: "Jefatura",
    usuario: "jefatura",
    descripcion: "Acceso general a todas las secciones y al panel de cuentas.",
  },
  {
    clave: "Jefe_Administracion",
    cargo: "Jefe de Administración",
    seccion: "Administración",
    usuario: "administracion",
    descripcion:
      "Jefe de la sección Administración; lectura general de la bandeja.",
  },
  {
    clave: "Jefe_ServicioGeneral",
    cargo: "Jefe de Servicio General",
    seccion: "Servicio General",
    usuario: "serviciogeneral",
    descripcion: "Jefe de la sección Servicio General.",
  },
  {
    clave: "Jefe_Maquinas",
    cargo: "Jefe de Máquinas",
    seccion: "Máquinas",
    usuario: "maquinas",
    descripcion: "Jefe de la sección Máquinas.",
  },
  {
    clave: "Jefe_Sanidad",
    cargo: "Jefe de Sanidad",
    seccion: "Sanidad",
    usuario: "sanidad",
    descripcion: "Jefe de la sección Sanidad.",
  },
];

export const ROL_JEFATURA: ClaveRol = "Jefatura";

/** Roles cuya contraseña puede administrar la Jefatura (todos menos ella). */
export const ROLES_ADMINISTRABLES: ClaveRol[] = [
  "Jefe_Administracion",
  "Jefe_ServicioGeneral",
  "Jefe_Maquinas",
  "Jefe_Sanidad",
];

export const rolPorClave = (clave: string): Rol | undefined =>
  ROLES.find((rol) => normalizar(rol.clave) === normalizar(clave));

/**
 * Rol del bombero según sus grupos de Cognito. Si perteneciera a varios,
 * gana el de mayor precedencia (el orden de `ROLES` coincide con la del pool).
 */
export function rolDe(grupos: string[]): Rol | undefined {
  const propios = new Set(grupos.map(normalizar));
  return ROLES.find((rol) => propios.has(normalizar(rol.clave)));
}

export function tieneRol(bombero: Bombero, clave: ClaveRol): boolean {
  return bombero.grupos.some((grupo) => normalizar(grupo) === normalizar(clave));
}

/** Compara sin tildes, guiones ni mayúsculas: "Jefe_Máquinas" ≡ "jefemaquinas". */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s_-]/g, "")
    .toLowerCase();
}
