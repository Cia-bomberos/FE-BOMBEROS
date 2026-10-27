"use server";

import { revalidatePath } from "next/cache";
import { guardarConfiguracionDrive } from "@/lib/configuracion-drive";

export type EstadoAccionConfig = {
  estado: "inicial" | "ok" | "error";
  mensaje?: string;
};

export async function actualizarDriveAction(
  prevState: EstadoAccionConfig,
  formData: FormData
): Promise<EstadoAccionConfig> {
  const enlace = formData.get("enlace") as string;

  if (!enlace?.includes("drive.google.com")) {
    return { estado: "error", mensaje: "Ingrese un enlace válido de Google Drive." };
  }

  try {
    const config = await guardarConfiguracionDrive(enlace);
    revalidatePath("/panel/configuracion/drive");
    
    return { 
      estado: "ok", 
      mensaje: `Carpeta configurada correctamente: ${config.carpeta_nombre || "Desconocida"}` 
    };
  } catch (error: any) {
    return { 
      estado: "error", 
      mensaje: error.message || "No se pudo guardar la configuración." 
    };
  }
}