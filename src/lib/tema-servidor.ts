import { cookies } from "next/headers";
import { COOKIE_TEMA, esTema, TEMA_POR_DEFECTO, type Tema } from "./tema";

/** Tema preferido por el usuario, leído de la cookie en el servidor. */
export async function obtenerTema(): Promise<Tema> {
  const almacen = await cookies();
  const valor = almacen.get(COOKIE_TEMA)?.value;
  return esTema(valor) ? valor : TEMA_POR_DEFECTO;
}
