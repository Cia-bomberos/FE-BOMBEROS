import type { ValorKpi } from "@/lib/kpis";
import styles from "../panel.module.css";

/**
 * Rejilla de indicadores. Cada tarjeta muestra el valor calculado o
 * registrado; si el periodo no tiene dato, lo dice explícitamente: un KPI
 * del catálogo nunca desaparece en silencio.
 */
export function Kpis({
  valores,
  tono,
}: {
  valores: ValorKpi[];
  tono?: string;
}) {
  if (valores.length === 0) {
    return (
      <p className={styles.vacio}>
        El catálogo de indicadores no define ningún KPI para esta sección.
      </p>
    );
  }

  return (
    <section className={styles.kpis}>
      {valores.map(({ kpi, valor, detalle, registro }) => (
        <article
          key={kpi.clave}
          className={`${styles.kpi} ${valor === null ? styles.kpiPendiente : ""}`}
          style={tono ? ({ "--tono": tono } as React.CSSProperties) : undefined}
          title={kpi.descripcion}
        >
          <span className={styles.kpiEtiqueta}>{kpi.nombre}</span>

          {valor === null ? (
            <>
              <span className={styles.kpiValor} aria-label="Sin dato">
                —
              </span>
              <span className={styles.kpiPie}>
                <span className={`${styles.etiqueta} ${styles.estadoPendiente}`}>
                  Sin dato del periodo
                </span>
              </span>
              <span className={styles.kpiRequiere}>{detalle}</span>
            </>
          ) : (
            <>
              <span className={styles.kpiValor}>
                {kpi.unidad === "S/" ? (
                  <>
                    <em className={styles.kpiUnidad}>S/</em> {valor}
                  </>
                ) : (
                  <>
                    {valor}
                    <em className={styles.kpiUnidad}>{kpi.unidad}</em>
                  </>
                )}
              </span>
              <span className={styles.kpiPie}>{detalle}</span>
              <span className={styles.kpiFormula}>
                {kpi.formula}
                {registro && (
                  <span className={styles.kpiRegistro}>Registró {registro}</span>
                )}
              </span>
            </>
          )}
        </article>
      ))}
    </section>
  );
}
