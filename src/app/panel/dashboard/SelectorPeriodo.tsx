import Link from "next/link";
import { etiquetaPeriodo, periodosDisponibles } from "@/lib/kpis";
import styles from "../panel.module.css";

/**
 * "Filtrar por periodo" del caso de uso: un chip por periodo con datos.
 * Es navegación (query `?periodo=`), así que la URL es compartible y el
 * servidor calcula los indicadores del periodo elegido.
 */
export function SelectorPeriodo({ ruta, actual }: { ruta: string; actual: string }) {
  return (
    <nav className={styles.chips} aria-label="Periodo de análisis">
      {periodosDisponibles().map((periodo) => (
        <Link
          key={periodo}
          href={periodo === actual ? ruta : `${ruta}?periodo=${periodo}`}
          className={`${styles.chip} ${periodo === actual ? styles.chipActivo : ""}`}
          aria-current={periodo === actual ? "true" : undefined}
        >
          {etiquetaPeriodo(periodo)}
        </Link>
      ))}
    </nav>
  );
}
