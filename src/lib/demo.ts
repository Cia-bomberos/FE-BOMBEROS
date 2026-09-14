import type { Bombero } from "./tipos";

/**
 * Perfil de prueba para ver el panel sin Cognito. Solo Jefatura: es el
 * único rol que ve todas las secciones, así que basta para recorrer la
 * interfaz completa. Los Jefes de Sección se prueban con cuentas reales
 * de Cognito en su grupo.
 *
 * Solo existen en `next dev`: `demoHabilitado()` es falso en cualquier build
 * de producción (Amplify incluido), así que ni los botones del login ni la
 * cookie `f3_demo` tienen efecto fuera del entorno local.
 */

export const COOKIE_DEMO = "f3_demo";

export function demoHabilitado(): boolean {
  return process.env.NODE_ENV === "development";
}

export type PerfilDemo = Bombero & { clave: string; rol: string };

export const PERFILES_DEMO: PerfilDemo[] = [
  {
    clave: "jefatura",
    rol: "Jefatura · vista general de todas las secciones",
    codigo: "B-0001",
    nombre: "Ricardo Salcedo Paredes",
    grado: "Teniente Brigadier CBP",
    cargo: "Primer Jefe",
    seccion: "Jefatura",
    iniciales: "RS",
    grupos: ["Jefatura"],
  },
];

export const perfilDemoPorClave = (clave: string) =>
  PERFILES_DEMO.find((perfil) => perfil.clave === clave) ?? null;
