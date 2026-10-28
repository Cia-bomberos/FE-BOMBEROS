"use client";

import { useActionState } from "react";
import { actualizarDriveAction, type EstadoAccionConfig } from "../actions";
import styles from "../../panel.module.css"; // Ajusta la ruta si es necesario

const estadoInicial: EstadoAccionConfig = { estado: "inicial" };

export function FormularioDrive({ 
  configInicial 
}: Readonly<{ 
  configInicial: Readonly<{ 
    enlace: string | null; 
    carpeta_nombre: string | null; 
    cuenta_respaldo: string | null; 
  }>; 
}>) {
  const [estado, enviar, pendiente] = useActionState(actualizarDriveAction, estadoInicial);

  return (
    <div className={styles.tarjeta}>
      <div className={styles.tarjetaEncabezado}>
        <h2 className={styles.tarjetaTitulo}>Configuración de Google Drive</h2>
      </div>

      {configInicial.carpeta_nombre && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#f3f4f6", borderRadius: "8px" }}>
          <p><strong>Carpeta actual:</strong> {configInicial.carpeta_nombre}</p>
          <p><strong>Enlace:</strong> <a href={configInicial.enlace || "#"} target="_blank" rel="noreferrer">{configInicial.enlace}</a></p>
          <p><strong>Cuenta de respaldo:</strong> {configInicial.cuenta_respaldo || "No configurada"}</p>
        </div>
      )}

      <form action={enviar} className={styles.formulario}>
        <div className={styles.formularioRejilla}>
          <div className={styles.campoAncho}>
            <span className={styles.campoEtiqueta}>Enlace de la carpeta de Drive</span>
            <input
              name="enlace"
              type="url"
              className={styles.entrada}
              placeholder="https://drive.google.com/drive/folders/..."
              defaultValue={configInicial.enlace || ""}
              disabled={pendiente}
              required
            />
            <span className={styles.campoAyuda}>
              Asegúrese de que la carpeta esté compartida como Editor con la cuenta de respaldo.
            </span>
          </div>
        </div>

        <div aria-live="polite" style={{ marginTop: "1rem" }}>
          {estado.estado === "error" && (
            <p className={`${styles.mensaje} ${styles.mensajeError}`} role="alert">
              {estado.mensaje}
            </p>
          )}
          {estado.estado === "ok" && (
            <output className={`${styles.mensaje} ${styles.mensajeOk}`}>
              {estado.mensaje}
            </output>
          )}
        </div>

        <div className={styles.formularioPie} style={{ marginTop: "1rem" }}>
          <button type="submit" className={styles.botonPrimario} disabled={pendiente}>
            {pendiente ? "Guardando..." : "Guardar enlace"}
          </button>
        </div>
      </form>
    </div>
  );
}