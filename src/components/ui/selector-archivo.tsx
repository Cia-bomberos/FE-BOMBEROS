"use client";

import { useState } from "react";
import styles from "./selector-archivo.module.css";

type Props = {
  nombre: string;
  id?: string;
  /** Nombre accesible cuando el campo no tiene un <label> asociado. */
  etiqueta?: string;
  /** Tipos admitidos, como en el `accept` del campo nativo. */
  aceptar?: string;
  required?: boolean;
  disabled?: boolean;
  /** `aria-invalid` para marcar error de validación. */
  invalido?: boolean;
  onCambio?: () => void;
};

const SIN_ARCHIVO = "Ningún archivo seleccionado";

/**
 * Selector de archivo en español. Los textos del <input type="file"> los pone
 * el navegador en su idioma, así que el campo real queda invisible sobre este
 * botón: sigue recibiendo clics, teclado y archivos arrastrados, y participa
 * en el formulario como siempre.
 */
export function SelectorArchivo({
  nombre,
  id,
  etiqueta,
  aceptar,
  required = false,
  disabled = false,
  invalido = false,
  onCambio,
}: Readonly<Props>) {
  const [archivo, setArchivo] = useState<string | null>(null);

  return (
    <div className={styles.raiz}>
      <input
        id={id}
        name={nombre}
        type="file"
        accept={aceptar}
        required={required}
        disabled={disabled}
        className={styles.campo}
        // Sin `title`, el navegador muestra su propio "No file chosen" al pasar el mouse.
        title={archivo ?? SIN_ARCHIVO}
        aria-label={etiqueta}
        aria-invalid={invalido || undefined}
        onChange={(e) => {
          setArchivo(e.target.files?.[0]?.name ?? null);
          onCambio?.();
        }}
      />
      <span className={styles.boton} aria-hidden="true">
        Elegir archivo
      </span>
      <span className={styles.nombre} data-vacio={archivo === null} aria-hidden="true">
        {archivo ?? SIN_ARCHIVO}
      </span>
    </div>
  );
}
