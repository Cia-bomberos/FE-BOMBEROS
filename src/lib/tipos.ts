import type { ClaimsToken } from "./jwt";

/** Tipos del dominio compartidos entre la autenticación y las vistas. */

/** Personal de la Compañía tal como lo consume el panel. */
export type Bombero = {
  codigo: string;
  nombre: string;
  grado: string;
  cargo: string;
  seccion: string;
  iniciales: string;
  /** Grupos de Cognito: base para permisos por rol (Jefatura, Oficiales…). */
  grupos: string[];
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
 * El grado, cargo y sección se toman de atributos personalizados del User
 * Pool. Para que lleguen, deben declararse en Cognito como `custom:grado`,
 * `custom:cargo` y `custom:seccion`, y estar marcados como legibles por el
 * App Client. Si faltan, se usan valores neutros en lugar de romper el panel.
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

  return {
    codigo: texto("custom:codigo", "cognito:username", "sub"),
    nombre,
    grado: texto("custom:grado") || "Bombero",
    cargo: texto("custom:cargo") || "Personal de la Compañía",
    seccion: texto("custom:seccion") || "General",
    iniciales: inicialesDe(nombre),
    grupos: Array.isArray(claims["cognito:groups"])
      ? (claims["cognito:groups"] as string[])
      : [],
  };
}
