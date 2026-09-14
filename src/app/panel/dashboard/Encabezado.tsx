import { ETIQUETA_FUENTE, type Seccion } from "@/lib/secciones";
import styles from "../panel.module.css";

/** Cabecera común de las secciones del dashboard, con su fuente de datos. */
export function EncabezadoSeccion({ seccion }: { seccion: Seccion }) {
  return (
    <header className={styles.encabezado}>
      <div>
        <p className={styles.migas}>
          Dashboard ejecutivo <span data-acento="">·</span> {seccion.nombre}
        </p>
        <h1 className={styles.titulo}>{seccion.nombre}</h1>
        <p className={styles.subtitulo}>{seccion.descripcion}</p>
      </div>
      <div className={styles.chips}>
        <span className={styles.chip} title={seccion.fuenteDetalle}>
          Fuente: {ETIQUETA_FUENTE[seccion.fuente]}
        </span>
        <span className={`${styles.chip} ${styles.chipActivo}`}>Este mes</span>
      </div>
    </header>
  );
}
