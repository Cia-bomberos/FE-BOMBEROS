"use client";

import { useState } from "react";
import styles from "../../../panel.module.css";

/**
 * Muestra el PDF en la página de detalle. Solo lo pide al abrirse, y verlo no
 * cuenta como descarga (RN-0027).
 *
 * Algunos navegadores móviles no muestran PDF dentro de la página: ahí se
 * ofrece abrirlo aparte, donde lo resuelve el visor del dispositivo.
 */
export function VisorDocumento({
  id,
  numero,
}: Readonly<{ id: string; numero: string }>) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);

  const url = `/panel/bandeja-documental/documentos/${id}/ver`;
  const conVisor = abierto && navigator.pdfViewerEnabled !== false;

  const alternar = () => {
    setCargando(true);
    setAbierto((estaba) => !estaba);
  };

  return (
    <section className={styles.tarjeta}>
      <div className={`${styles.tarjetaEncabezado} ${styles.visorEncabezado}`}>
        <h2 className={styles.tarjetaTitulo}>Documento</h2>
        <div className={styles.visorAcciones}>
          {abierto && (
            <a
              className={styles.botonSecundario}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir en otra pestaña
            </a>
          )}
          <button
            type="button"
            className={styles.botonSecundario}
            onClick={alternar}
            aria-expanded={abierto}
          >
            {abierto ? "Ocultar documento" : "Ver documento"}
          </button>
        </div>
      </div>

      {abierto && !conVisor && (
        <p className={styles.campoAyuda}>
          Este navegador no muestra PDF dentro de la página. Use “Abrir en otra pestaña”.
        </p>
      )}

      {conVisor && (
        <>
          {cargando && (
            <p className={styles.campoAyuda} aria-live="polite">
              Cargando documento…
            </p>
          )}
          <iframe
            className={styles.visorMarco}
            src={url}
            title={`Documento ${numero}`}
            onLoad={() => setCargando(false)}
          />
        </>
      )}
    </section>
  );
}
