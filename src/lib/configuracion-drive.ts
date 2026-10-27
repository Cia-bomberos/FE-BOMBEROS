import { apiFetch, type RespuestaApi } from "./api";

export type ConfigDrive = {
  configurado: boolean;
  origen: "configuracion" | "variable_de_entorno" | null;
  carpeta_id: string | null;
  carpeta_nombre: string | null;
  enlace: string | null;
  actualizado_por: string | null;
  actualizado_en: string | null;
  cuenta_respaldo: string | null;
};

export async function guardarConfiguracionDrive(enlace: string): Promise<ConfigDrive> {
  const respuesta = await apiFetch<ConfigDrive>("/configuracion/drive", {
    metodo: "PUT",
    servicio: "bandeja",
    cuerpo: { enlace },
  });

  if (!respuesta.ok) {
    throw new Error(respuesta.motivo);
  }

  return respuesta.datos;
}

export async function obtenerConfiguracionDrive(): Promise<ConfigDrive> {
  const respuesta = await apiFetch<ConfigDrive>("/configuracion/drive", {
    metodo: "GET",
    servicio: "bandeja",
  });

  if (!respuesta.ok) {
    throw new Error(respuesta.motivo);
  }

  return respuesta.datos;
}