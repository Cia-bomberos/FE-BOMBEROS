import type { KpisBandeja, PuntoMensual } from "@/lib/resumen-bandeja";
import styles from "../panel.module.css";

/** Un documento entre muchos debe seguir viéndose en el anillo. */
const FRACCION_MINIMA = 0.015;

function fraccion(parte: number, total: number) {
  if (parte <= 0 || total <= 0) return 0;
  return Math.max(parte / total, FRACCION_MINIMA);
}

/**
 * Cifras del resumen en un solo panel, divididas por líneas finas. El color se
 * reserva para lo que avisa algo: la variación del mes y los plazos vencidos.
 * Cada cifra lleva un anillo con la proporción que la explica.
 */
export function KpisResumen({
  kpis,
  previo,
}: Readonly<{ kpis: KpisBandeja; previo: PuntoMensual | null }>) {
  const { ingresosMes, variacionIngresos, porAtender, vencidos, atendidos, total } = kpis;
  const ingresosPrevios = previo?.valor ?? 0;

  return (
    <section className={styles.resumenKpis}>
      <Cifra
        etiqueta="Ingresos"
        valor={ingresosMes}
        proporcion={fraccion(ingresosMes, Math.max(ingresosMes, ingresosPrevios))}
        descripcion={
          previo
            ? `${ingresosMes} ingresos este mes frente a ${previo.valor} en ${previo.mes}`
            : `${ingresosMes} ingresos este mes`
        }
      >
        Este mes
        {variacionIngresos !== null && (
          <span className={styles.resumenKpiVariacion}>
            <span className={variacionIngresos >= 0 ? styles.subeBien : styles.bajaMal}>
              {variacionIngresos >= 0 ? "+" : "−"}
              {Math.abs(variacionIngresos)}%
            </span>
            {previo && ` vs. ${previo.mes}`}
          </span>
        )}
      </Cifra>

      <Cifra
        etiqueta="Por atender"
        valor={porAtender}
        proporcion={fraccion(vencidos, porAtender)}
        descripcion={`${vencidos} de ${porAtender} por atender con plazo vencido`}
        alerta
      >
        {vencidos > 0 ? (
          <span className={styles.resumenKpiAlerta}>{vencidos} con plazo vencido</span>
        ) : (
          "Ninguno vencido"
        )}
      </Cifra>

      <Cifra
        etiqueta="Atendidos"
        valor={atendidos}
        proporcion={fraccion(atendidos, total)}
        descripcion={`${atendidos} de ${total} documentos atendidos`}
      >
        De {total} documentos
      </Cifra>
    </section>
  );
}

function Cifra({
  etiqueta,
  valor,
  proporcion,
  descripcion,
  alerta = false,
  children,
}: Readonly<{
  etiqueta: string;
  valor: number;
  /** De 0 a 1: cuánto se llena el anillo. */
  proporcion: number;
  descripcion: string;
  alerta?: boolean;
  children: React.ReactNode;
}>) {
  return (
    <article className={styles.resumenKpi}>
      <span className={styles.resumenKpiEtiqueta}>{etiqueta}</span>
      <span className={styles.resumenKpiValor}>{valor}</span>
      <span className={styles.resumenKpiNota}>{children}</span>
      <svg
        className={styles.resumenKpiAnillo}
        viewBox="0 0 36 36"
        role="img"
        aria-label={descripcion}
        data-alerta={alerta}
      >
        <title>{descripcion}</title>
        <circle className={styles.resumenKpiPista} cx="18" cy="18" r="16" />
        <circle
          className={styles.resumenKpiAvance}
          cx="18"
          cy="18"
          r="16"
          pathLength={100}
          strokeDasharray={`${proporcion * 100} 100`}
        />
      </svg>
    </article>
  );
}
