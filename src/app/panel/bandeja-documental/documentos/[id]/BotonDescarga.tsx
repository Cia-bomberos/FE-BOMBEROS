"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconDescarga } from "../../../iconos";
import styles from "../../../panel.module.css";

export function BotonDescarga({
  id,
  numero,
}: Readonly<{ id: string; numero: string }>) {
  const router = useRouter();
  const [descargando, setDescargando] = useState(false);

  async function descargar() {
    setDescargando(true);
    try {
      const respuesta = await fetch(
        `/panel/bandeja-documental/documentos/${id}/descargar`,
      );
      if (!respuesta.ok) throw new Error(String(respuesta.status));

      const blob = await respuesta.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Vuelve a pedir los Server Components de esta ruta: la trazabilidad
      // incluye ya la entrada "Descarga" sin recargar la página entera.
      router.refresh();
    } catch {
      // Sin aviso específico: el botón vuelve a habilitarse y el usuario
      // puede reintentar. Si quieres un mensaje, aquí es el sitio.
    } finally {
      setDescargando(false);
    }
  }

  return (
    <button
      type="button"
      className={styles.botonSecundario}
      onClick={descargar}
      disabled={descargando}
      title={descargando ? "Descargando…" : "Descargar PDF"}
    >
      <IconDescarga width={14} height={14} />
      {descargando ? "Descargando…" : "Descargar"}
    </button>
  );
}