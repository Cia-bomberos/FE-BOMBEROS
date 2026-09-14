/** Estado que devuelven las Server Actions de la bandeja a sus formularios. */
export type EstadoAccion =
  | { estado: "inicial" }
  | { estado: "error"; mensaje: string; campo?: string }
  | { estado: "ok"; mensaje: string };

export const estadoInicial: EstadoAccion = { estado: "inicial" };
