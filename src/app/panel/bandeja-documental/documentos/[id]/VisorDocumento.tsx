"use client";

import { useId, useState } from "react";
import { IconChevron, IconDocumento, IconExterno, IconOjo } from "../../../iconos";
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
  actualizado,
}: Readonly<{ id: string; numero: string; actualizado?: string }>) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const idLienzo = useId();

  const url = `/panel/bandeja-documental/documentos/${id}/ver`;
  const conVisor = abierto && navigator.pdfViewerEnabled !== false;

  const alternar = () => {
    setCargando(true);
    setAbierto((estaba) => !estaba);
  };

  return (
    <section className={`${styles.tarjeta} ${styles.visor}`} data-abierto={abierto}>
      <div className={styles.visorCabecera}>
        <div className={styles.visorArchivo}>
          <span className={styles.visorIcono}>
            <IconDocumento width={22} height={22} />
            <span className={styles.visorFormato}>PDF</span>
          </span>
          <div className={styles.visorTexto}>
            <h2 className={styles.tarjetaTitulo}>Documento</h2>
            <p className={styles.visorNombre}>{numero}</p>
            <p className={styles.visorMeta}>
              {actualizado ? `Actualizado ${actualizado} · ` : ""}La vista previa no cuenta como
              descarga
            </p>
          </div>
        </div>

        <div className={styles.visorAcciones}>
          {abierto && (
            <a
              className={styles.botonSecundario}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconExterno width={14} height={14} />
              Abrir en otra pestaña
            </a>
          )}
          <button
            type="button"
            className={styles.visorAlternar}
            onClick={alternar}
            aria-expanded={abierto}
            aria-controls={idLienzo}
          >
            <IconOjo width={15} height={15} />
            {abierto ? "Ocultar documento" : "Ver documento"}
            <IconChevron width={14} height={14} className={styles.visorChevron} />
          </button>
        </div>
      </div>

      <div id={idLienzo} hidden={!abierto}>
        {abierto && !conVisor && (
          <p className={styles.visorAviso}>
            Este navegador no muestra PDF dentro de la página. Use “Abrir en otra pestaña”.
          </p>
        )}

        {conVisor && (
          <div className={styles.visorLienzo}>
            {cargando && (
              <div className={styles.visorCarga} aria-live="polite">
                <span className={styles.visorHoja} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
                <p>Cargando documento…</p>
              </div>
            )}
            <iframe
              className={styles.visorMarco}
              src={url}
              title={`Documento ${numero}`}
              onLoad={() => setCargando(false)}
            />
          </div>
        )}
      </div>
    </section>
  );
}
