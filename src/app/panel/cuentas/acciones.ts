"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoAccion } from "@/app/panel/bandeja-documental/estado";
import { cambiarPasswordCuenta, validarPolitica } from "@/lib/cuentas-api";
import { ROL_JEFATURA, rolPorClave, ROLES_ADMINISTRABLES } from "@/lib/roles";
import { esJefatura } from "@/lib/secciones";
import { obtenerSesion } from "@/lib/sesion";

/**
 * Cambio de contraseña de las cuentas compartidas (RN-0042, RN-0043).
 *
 * Solo Jefatura, y nunca sobre la propia cuenta de Jefatura. Se valida aquí
 * para responder rápido; el backend repite las mismas comprobaciones con el
 * token (RNF-0004).
 */

const error = (mensaje: string, campo?: string): EstadoAccion => ({
  estado: "error", mensaje, campo,
});

export async function cambiarPassword(
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const bombero = await obtenerSesion();
  if (!bombero) redirect("/login");
  if (!esJefatura(bombero)) {
    return error("Solo la Jefatura puede cambiar contraseñas.");
  }

  const username = String(formData.get("username") ?? "").trim();
  const grupo = String(formData.get("grupo") ?? "").trim();
  const nueva = String(formData.get("nueva") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");

  const rol = rolPorClave(grupo);
  if (!username || !rol || rol.clave === ROL_JEFATURA || !ROLES_ADMINISTRABLES.includes(rol.clave)) {
    return error("La cuenta de Jefatura no puede modificarse desde este panel (RN-0043).");
  }

  const motivo = validarPolitica(nueva);
  if (motivo) return error(motivo, `nueva-${username}`);
  if (nueva !== confirmacion) {
    return error("Las contraseñas no coinciden.", `confirmacion-${username}`);
  }

  const respuesta = await cambiarPasswordCuenta(username, nueva);
  if (!respuesta.ok) return error(respuesta.motivo);

  revalidatePath("/panel/cuentas");
  return { estado: "ok", mensaje: respuesta.datos.mensaje || `Contraseña actualizada para ${username}.` };
}
