"use client";

import { IconAlerta } from "../iconos";
import styles from "../panel.module.css";

/**
 * La bandeja depende de MS-BANDEJA-BOMBEROS. Si no responde (o falta
 * su `bandeja-config.json` en S3), se muestra este aviso dentro del panel en vez de
 * tumbar la página. En producción el mensaje real del error no llega al
 * navegador, por eso el texto es genérico.
 */
export default function ErrorBandeja({ retry }: Readonly<{ error: Error; retry: () => void }>) {
  return (
    <div className={`${styles.contenido} ${styles.moduloMesa}`}>
      <section className={styles.tarjeta}>
        <p className={`${styles.mensaje} ${styles.mensajeError}`} role="alert">
          <IconAlerta width={14} height={14} />
          No se pudo cargar la Bandeja Documental. El servicio no respondió.
        </p>
        <div className={styles.formularioPie}>
          <button type="button" className={styles.botonPrimario} onClick={() => retry()}>
            Reintentar
          </button>
        </div>
      </section>
    </div>
  );
}
