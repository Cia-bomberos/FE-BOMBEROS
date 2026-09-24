"use client";

import { useActionState, useState } from "react";
import { eliminarArchivado } from "../../acciones";
import { estadoInicial } from "../../estado";
import { IconAlerta } from "../../../iconos";
import styles from "../../../panel.module.css";

/**
 * "Eliminar registro archivado" incluye "Confirmar eliminación definitiva":
 * dos pasos, y el segundo exige declarar que el archivo ya está en Drive
 * (RN-0028). Solo se renderiza para quien puede hacerlo.
 */
export function EliminarArchivado({ id, numero }: { id: string; numero: string }) {
  const [estado, enviar, pendiente] = useActionState(eliminarArchivado, estadoInicial);
  const [abierto, setAbierto] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  return (
    <section className={`${styles.tarjeta} ${styles.zonaPeligro}`}>
      <div className={styles.tarjetaEncabezado}>
        <h2 className={styles.tarjetaTitulo}>Eliminar registro</h2>
        <span className={styles.tarjetaNota}>Solo Administración · solo Archivado</span>
      </div>

      {!abierto ? (
        <>
          <p className={styles.campoAyuda} style={{ marginBottom: "1rem" }}>
            Borra de la plataforma la metadata, el historial y el archivo de{" "}
            <strong>{numero}</strong>. El documento debe estar ya respaldado en
            Google Drive. Esta acción no se puede deshacer.
          </p>
          <button type="button" className={styles.botonPeligro} onClick={() => setAbierto(true)}>
            Eliminar registro…
          </button>
        </>
      ) : (
        <form className={styles.formulario} action={enviar}>
          <input type="hidden" name="id" value={id} />
          <label className={styles.adjunto} style={{ cursor: "pointer" }}>
            <input
              type="checkbox"
              name="confirmacion"
              checked={confirmado}
              onChange={(e) => setConfirmado(e.target.checked)}
              disabled={pendiente}
            />
            <span>
              Confirmo que {numero} está respaldado en Google Drive y entiendo
              que la eliminación es definitiva.
            </span>
          </label>

          {estado.estado === "error" && (
            <p className={`${styles.mensaje} ${styles.mensajeError}`} role="alert">
              <IconAlerta width={14} height={14} />
              {estado.mensaje}
            </p>
          )}

          <div className={styles.formularioPie}>
            <button type="button" className={styles.botonSecundario} onClick={() => setAbierto(false)} disabled={pendiente}>
              Cancelar
            </button>
            <button type="submit" className={styles.botonPeligro} disabled={!confirmado || pendiente}>
              {pendiente ? "Eliminando…" : "Eliminar definitivamente"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
