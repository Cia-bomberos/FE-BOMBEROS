import type { ClaimsToken } from "./jwt";
import { rolDe, type ClaveRol } from "./roles";

/** Tipos del dominio compartidos entre la autenticación y las vistas. */

/** Personal de la Compañía tal como lo consume el panel. */
export type Bombero = {
  codigo: string;
  nombre: string;
  grado: string;
  cargo: string;
  seccion: string;
  iniciales: string;
  /** Grupos de Cognito tal como vienen en el token. */
  grupos: string[];
  /** Rol reconocido entre los grupos (ver `roles.ts`); `null` si no hay ninguno. */
  rol: ClaveRol | null;
};

/** Iniciales a partir del nombre completo. */
export function inicialesDe(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Construye el perfil del bombero con los claims del ID token.
 *
 * El User Pool del backend solo define el atributo `name`; el cargo y la
 * sección se deducen del rol (grupo de Cognito). Si algún día se agregan los
 * atributos `custom:grado`, `custom:cargo` y `custom:seccion` legibles por el
 * App Client, tienen prioridad sobre lo deducido.
 */
export function bomberoDesdeClaims(claims: ClaimsToken): Bombero {
  const texto = (...claves: string[]): string => {
    for (const clave of claves) {
      const valor = claims[clave];
      if (typeof valor === "string" && valor.trim()) return valor.trim();
    }
    return "";
  };

  const nombre =
    texto("name", "custom:nombre") ||
    [texto("given_name"), texto("family_name")].filter(Boolean).join(" ") ||
    texto("cognito:username", "email", "sub");

  const grupos = Array.isArray(claims["cognito:groups"])
    ? (claims["cognito:groups"] as string[])
    : [];
  const rol = rolDe(grupos);

  return {
    codigo: texto("custom:codigo", "cognito:username", "sub"),
    nombre,
    grado: texto("custom:grado"),
    cargo: texto("custom:cargo") || rol?.cargo || "Personal de la Compañía",
    seccion: texto("custom:seccion") || rol?.seccion || "General",
    iniciales: inicialesDe(nombre),
    grupos,
    rol: rol?.clave ?? null,
  };
}
