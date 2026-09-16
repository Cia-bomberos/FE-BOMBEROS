"use server";

import { acceder, definirClaveDefinitiva, type ResultadoAcceso } from "@/lib/auth";
import type { EstadoAcceso } from "./estado";

/** Longitud mínima que exige la política por defecto de Cognito. */
const LARGO_MINIMO_CLAVE = 8;

/**
 * Única acción del formulario de acceso. El campo oculto `paso` distingue
 * entre el ingreso normal y el cambio de contraseña del primer acceso, de
 * modo que ambos comparten un solo estado en el cliente.
 */
export async function solicitarAcceso(
  previo: EstadoAcceso,
  formData: FormData,
): Promise<EstadoAcceso> {
  return formData.get("paso") === "nueva-clave"
    ? definirClave(formData)
    : ingresar(formData);
}

async function ingresar(formData: FormData): Promise<EstadoAcceso> {
  const usuario = String(formData.get("usuario") ?? "").trim();
  const clave = String(formData.get("clave") ?? "");
  const recordar = formData.get("recordar") === "on";

  if (!usuario) {
    return {
      estado: "error",
      campo: "usuario",
      mensaje: "Ingrese el usuario de su sección (por ejemplo, sanidad).",
    };
  }

  if (!clave) {
    return {
      estado: "error",
      campo: "clave",
      mensaje: "Ingrese su contraseña para continuar.",
    };
  }

  const resultado = await acceder(usuario, clave, recordar);

  if (resultado.estado === "nueva-clave-requerida") {
    return { estado: "nueva-clave" };
  }

  return traducir(resultado, "clave");
}

async function definirClave(formData: FormData): Promise<EstadoAcceso> {
  const nueva = String(formData.get("nueva") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");
  const recordar = formData.get("recordar") === "on";

  if (nueva.length < LARGO_MINIMO_CLAVE) {
    return {
      estado: "nueva-clave",
      campo: "nueva",
      mensaje: `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`,
    };
  }

  if (nueva !== confirmacion) {
    return {
      estado: "nueva-clave",
      campo: "confirmacion",
      mensaje: "Las contraseñas no coinciden.",
    };
  }

  const resultado = await definirClaveDefinitiva(nueva, recordar);

  // Un rechazo de política se corrige sin salir de esta pantalla; cualquier
  // otro error (sesión del reto vencida) devuelve al formulario de ingreso.
  if (resultado.estado === "error") {
    const recuperable = resultado.motivo.includes("política");
    return recuperable
      ? { estado: "nueva-clave", campo: "nueva", mensaje: resultado.motivo }
      : { estado: "error", mensaje: resultado.motivo };
  }

  return traducir(resultado, "nueva");
}

function traducir(
  resultado: ResultadoAcceso,
  campoCulpable: "clave" | "nueva",
): EstadoAcceso {
  if (resultado.estado === "ok") {
    return {
      estado: "concedido",
      nombre: resultado.bombero.nombre,
      grado: resultado.bombero.grado,
    };
  }

  if (resultado.estado === "error") {
    return {
      estado: "error",
      // Un fallo de configuración o de red no es culpa de la contraseña:
      // en ese caso no se marca ningún campo como inválido.
      campo: resultado.sinConfigurar ? undefined : campoCulpable,
      mensaje: resultado.motivo,
    };
  }

  return { estado: "nueva-clave" };
}
