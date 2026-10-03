import { NextResponse, type NextRequest } from "next/server";
import { MOTIVO_INACTIVIDAD } from "@/lib/inactividad";
import { cerrarSesion } from "@/lib/sesion";

/**
 * Cierre por inactividad que dispara el vigilante del navegador.
 *
 * Es un POST de formulario nativo y no una acción del servidor: si el
 * middleware ya cortó la sesión, su redirección al login se sigue como una
 * navegación normal.
 */
export async function POST(peticion: NextRequest) {
  await cerrarSesion();

  const destino = new URL("/login", peticion.url);
  destino.searchParams.set("motivo", MOTIVO_INACTIVIDAD);
  return NextResponse.redirect(destino, 303);
}
