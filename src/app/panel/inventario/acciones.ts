"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoAccion } from "@/app/panel/bandeja-documental/estado";
import {
  CATEGORIAS_ACTIVO,
  ESTADOS_ACTIVO,
  puedeRegistrarActivo,
  registrarActivo,
  seccionesInventarioDe,
  type CategoriaActivo,
  type EstadoActivo,
} from "@/lib/inventario-repo";
import type { ClaveSeccion } from "@/lib/secciones";
import { obtenerSesion } from "@/lib/sesion";

/**
 * Acciones del inventario. Igual que en la bandeja, la sesión y el permiso
 * se vuelven a comprobar en el servidor (RNF-0004).
 */

const texto = (formData: FormData, clave: string) =>
  String(formData.get(clave) ?? "").trim();

const error = (mensaje: string, campo?: string): EstadoAccion => ({
  estado: "error", mensaje, campo,
});

/* ---------- Registrar activo o recurso (RN-0036) ---------- */

export async function registrar(
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const bombero = await obtenerSesion();
  if (!bombero) redirect("/login");
  if (!puedeRegistrarActivo(bombero)) {
    return error("Su cuenta no tiene una sección con inventario asignada.");
  }

  const descripcion = texto(formData, "descripcion");
  const categoria = texto(formData, "categoria") as CategoriaActivo;
  const cantidad = Number(formData.get("cantidad") ?? 0);
  const ubicacion = texto(formData, "ubicacion");
  const estado = texto(formData, "estado") as EstadoActivo;
  const seccion = texto(formData, "seccion") as ClaveSeccion;
  const observaciones = texto(formData, "observaciones");

  if (descripcion.length < 4) return error("Describa el activo o recurso.", "descripcion");
  if (!CATEGORIAS_ACTIVO.includes(categoria)) return error("Seleccione la categoría.", "categoria");
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    return error("Indique la cantidad (entero mayor a cero).", "cantidad");
  }
  if (!ubicacion) return error("Indique la ubicación del recurso.", "ubicacion");
  if (!ESTADOS_ACTIVO.includes(estado)) return error("Seleccione el estado.", "estado");
  if (!seccionesInventarioDe(bombero).includes(seccion)) {
    return error("Seleccione la sección responsable.", "seccion");
  }

  const { codigo } = await registrarActivo(
    {
      descripcion, categoria, cantidad, ubicacion, estado, seccion,
      observaciones: observaciones || undefined,
    },
    bombero,
  );

  revalidatePath("/panel/inventario");
  redirect(`/panel/inventario?registrado=${codigo}`);
}
