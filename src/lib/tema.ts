/**
 * Tema visual del panel. Se guarda en una cookie legible por el cliente
 * para que el servidor pinte el tema correcto desde el primer byte, sin
 * parpadeo, y el botón del header lo cambie al instante.
 *
 * Este módulo no importa nada de servidor: lo comparten el layout y el
 * toggle (cliente). La lectura de la cookie vive en `tema-servidor.ts`.
 */

export const COOKIE_TEMA = "f3_tema";

export type Tema = "dark" | "light";

export const TEMA_POR_DEFECTO: Tema = "dark";

export const esTema = (valor: unknown): valor is Tema =>
  valor === "dark" || valor === "light";
