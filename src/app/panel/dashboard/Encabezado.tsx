import { ETIQUETA_FUENTE, type Seccion } from "@/lib/secciones";
import { SelectorPeriodo } from "./SelectorPeriodo";
import styles from "../panel.module.css";

/** Cabecera común de las secciones del dashboard, con fuente y periodo. */
export function EncabezadoSeccion({
  seccion,
  periodo,
}: {
  seccion: Seccion;
  periodo: string;
}) {
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
        <SelectorPeriodo ruta={seccion.ruta} actual={periodo} />
      </div>
    </header>
  );
}
