"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoAccion } from "@/app/panel/bandeja-documental/estado";
import { cambiarPasswordCuenta, validarPolitica, cambiarUsernameCuenta } from "@/lib/cuentas-api";
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

  const usernameValue = formData.get("username");
  const username = typeof usernameValue === "string" ? usernameValue.trim() : "";
  const grupoValue = formData.get("grupo");
  const grupo = typeof grupoValue === "string" ? grupoValue.trim() : "";
  const nuevaValue = formData.get("nueva");
  const nueva = typeof nuevaValue === "string" ? nuevaValue.trim() : "";
  const confirmacionValue = formData.get("confirmacion");
  const confirmacion = typeof confirmacionValue === "string" ? confirmacionValue.trim() : "";

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

export async function cambiarUsername(
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const bombero = await obtenerSesion();
  if (!bombero) redirect("/login");
  if (!esJefatura(bombero)) {
    return error("Solo la Jefatura puede cambiar nombres de usuario.");
  }

  const actualValue = formData.get("username");
  const actual = typeof actualValue === "string" ? actualValue.trim() : "";
  const grupoValue = formData.get("grupo");
  const grupo = typeof grupoValue === "string" ? grupoValue.trim() : "";
  const nuevoValue = formData.get("nuevo_username");
  const nuevo = typeof nuevoValue === "string" ? nuevoValue.trim() : "";
  const nuevaPasswordValue = formData.get("nueva_password");
  const nuevaPassword = typeof nuevaPasswordValue === "string" ? nuevaPasswordValue.trim() : "";

  const rol = rolPorClave(grupo);
  if (!actual || !rol || rol.clave === ROL_JEFATURA || !ROLES_ADMINISTRABLES.includes(rol.clave)) {
    return error("La cuenta de Jefatura no puede modificarse desde este panel (RN-0043).");
  }

  if (nuevo.length < 3) {
    return error("El nuevo usuario debe tener al menos 3 caracteres.", `nuevo_username-${actual}`);
  }

  const motivo = validarPolitica(nuevaPassword);
  if (motivo) return error(motivo, `nueva_password-${actual}`);

  const respuesta = await cambiarUsernameCuenta(actual, nuevo, nuevaPassword);
  if (!respuesta.ok) return error(respuesta.motivo);

  revalidatePath("/panel/cuentas");
  return { estado: "ok", mensaje: respuesta.datos.mensaje || `Usuario cambiado a ${nuevo}.` };
}