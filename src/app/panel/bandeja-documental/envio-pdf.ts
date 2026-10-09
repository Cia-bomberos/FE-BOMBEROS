"use client";

import { startTransition, useState, type FormEvent } from "react";
import { MENSAJE_PDF_GRANDE, superaMaxPdf } from "@/lib/archivo-pdf";
import type { EstadoAccion } from "./estado";

/**
 * Envío de los formularios con PDF de la bandeja (registro y adjunto).
 *
 * El tamaño se revisa en el navegador antes de enviar: la Server Action
 * admite hasta 21 MB (`next.config.ts`) y un archivo mayor tumba la
 * petición antes de que `validarPdf` pueda responder, con lo que se
 * mostraba la pantalla de error y se perdía el formulario.
 *
 * Además se envía desde `onSubmit` y no desde `action`: con `action`,
 * React vacía los campos no controlados (asunto, archivo) al terminar,
 * aunque el servidor haya devuelto un error de validación.
 */
export function useEnvioPdf(estado: EstadoAccion, enviar: (formData: FormData) => void) {
  const [aviso, setAviso] = useState<string | null>(null);

  function alEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("archivo");
    const archivo = input instanceof HTMLInputElement ? input.files?.[0] : undefined;

    if (superaMaxPdf(archivo)) {
      setAviso(MENSAJE_PDF_GRANDE);
      return;
    }
    setAviso(null);
    const formData = new FormData(form);
    startTransition(() => enviar(formData));
  }

  const visible: EstadoAccion = aviso
    ? { estado: "error", mensaje: aviso, campo: "archivo" }
    : estado;

  return { estado: visible, alEnviar, limpiarAviso: () => setAviso(null) };
}
