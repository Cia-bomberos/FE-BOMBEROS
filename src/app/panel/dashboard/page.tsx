import Link from "next/link";
import type { Metadata } from "next";
import {
  calcularKpi,
  etiquetaPeriodo,
  KPIS,
  kpisDeSeccion,
  resolverPeriodo,
  serieDeKpi,
} from "@/lib/kpis";
import { ETIQUETA_FUENTE, seccionPorClave } from "@/lib/secciones";
import { IconFlecha } from "../iconos";
import { resolverVistaGeneral } from "./acceso";
import { EvolucionIndicador, type SerieIndicador } from "./EvolucionIndicador";
import { Kpis } from "./Kpis";
import { SelectorPeriodo } from "./SelectorPeriodo";
import styles from "../panel.module.css";

export const metadata: Metadata = { title: "Dashboard ejecutivo" };

type Props = { searchParams: Promise<{ periodo?: string }> };

export default async function DashboardEjecutivo({ searchParams }: Props) {
  const { secciones, jefatura } = await resolverVistaGeneral();
  const periodo = resolverPeriodo((await searchParams).periodo);

  // Sin secciones asignadas no hay nada que mostrar: el rol viene de Cognito.
  if (secciones.length === 0) {
    return (
      <div className={`${styles.contenido} ${styles.moduloEjecutivo}`}>
        <header className={styles.encabezado}>
          <div>
            <p className={styles.migas}>
              Proyecto 2 <span data-acento="">·</span> Tablero de control
            </p>
            <h1 className={styles.titulo}>Dashboard ejecutivo</h1>
          </div>
        </header>
        <section className={styles.tarjeta}>
          <p className={styles.vacio}>
            Su cuenta no tiene una sección asignada. Solicite a la Jefatura que
            lo incorpore al grupo de su sección en el directorio institucional.
          </p>
        </section>
      </div>
    );
  }

  // Cinta superior: los indicadores que la plataforma calcula sola a partir
  // del inventario y la bandeja. Los de registro se ven en cada sección.
  const calculables = await Promise.all(
    KPIS.filter((kpi) => kpi.fuente !== "registro")
      .filter((kpi) => kpi.secciones.some((s) => secciones.some((v) => v.clave === s)))
      .map((kpi) => calcularKpi(kpi, periodo)),
  );

  const porSeccion = await Promise.all(
    secciones.map(async (seccion) => ({
      seccion,
      valores: await kpisDeSeccion(seccion.clave, periodo),
    })),
  );
  // Evolución mensual: los KPIs de registro visibles con al menos 2 meses.
  const series: SerieIndicador[] = KPIS.filter(
    (kpi) =>
      kpi.fuente === "registro" &&
      kpi.secciones.some((c) => secciones.some((v) => v.clave === c)),
  )
    .map((kpi) => ({
      clave: kpi.clave,
      nombre: kpi.nombre,
      unidad: kpi.unidad,
      seccion: seccionPorClave(kpi.secciones[0])?.nombre ?? "",
      puntos: serieDeKpi(kpi).map((p) => ({
        etiqueta: etiquetaPeriodo(p.periodo).slice(0, 3).replace(/^./, (c) => c.toUpperCase()),
        nombre: etiquetaPeriodo(p.periodo).replace(/^./, (c) => c.toUpperCase()),
        valor: p.valor,
      })),
    }))
    .filter((s) => s.puntos.length >= 2);

  const visibles = KPIS.filter((kpi) =>
    kpi.secciones.some((s) => secciones.some((v) => v.clave === s)),
  );

  return (
    <div className={`${styles.contenido} ${styles.moduloEjecutivo}`}>
      <header className={styles.encabezado}>
        <div>
          <p className={styles.migas}>
            Proyecto 2 <span data-acento="">·</span> Tablero de control
          </p>
          <h1 className={styles.titulo}>Dashboard ejecutivo</h1>
          <p className={styles.subtitulo}>
            {jefatura
              ? `Vista general de las ${secciones.length} secciones de la Compañía y sus ${visibles.length} indicadores.`
              : "Indicadores de las secciones a su cargo."}
          </p>
        </div>
        <div className={styles.chips}>
          <span className={styles.chip}>
            {calculables.length} calculados · {visibles.length - calculables.length}{" "}
            registrados
          </span>
          <SelectorPeriodo ruta="/panel/dashboard" actual={periodo} />
        </div>
      </header>

      <Kpis valores={calculables} />

      <section className={`${styles.tarjeta} ${styles.tarjetaGrafico}`}>
        <div className={styles.tarjetaEncabezado}>
          <h2 className={styles.tarjetaTitulo}>Evolución mensual de indicadores</h2>
          <span className={styles.tarjetaNota}>
            {series[0]?.puntos[0]?.nombre} – {series[0]?.puntos.at(-1)?.nombre}
          </span>
        </div>
        <EvolucionIndicador series={series} />
      </section>

      <section className={styles.rejilla}>
        {porSeccion.map(({ seccion, valores }) => (
          <Link
            key={seccion.clave}
            href={`${seccion.ruta}?periodo=${periodo}`}
            className={`${styles.tarjeta} ${styles.seccionTarjeta}`}
            style={{ "--tono": seccion.tono } as React.CSSProperties}
          >
            <div className={styles.tarjetaEncabezado} style={{ marginBottom: 0 }}>
              <div>
                <span className={styles.seccionFuente}>
                  Desde {ETIQUETA_FUENTE[seccion.fuente]}
                </span>
                <h2 className={styles.tarjetaTitulo} style={{ marginTop: "0.3rem" }}>
                  {seccion.nombre}
                </h2>
              </div>
              <IconFlecha width={15} height={15} />
            </div>

            <ul className={styles.seccionKpis}>
              {valores.map(({ kpi, valor }) => (
                <li key={kpi.clave} className={styles.seccionKpi}>
                  <span>{kpi.nombre}</span>
                  {valor === null ? (
                    <span className={styles.seccionKpiPendiente}>Sin dato</span>
                  ) : (
                    <span className={styles.seccionKpiValor}>
                      {kpi.unidad === "S/" ? (
                        <>
                          <em>S/</em> {valor}
                        </>
                      ) : (
                        <>
                          {valor}
                          <em>{kpi.unidad}</em>
                        </>
                      )}
                    </span>
                  )}
                </li>
              ))}
              {valores.length === 0 && (
                <li className={styles.seccionKpi}>
                  <span className={styles.tarjetaNota}>
                    Sin KPIs definidos en el catálogo
                  </span>
                </li>
              )}
            </ul>
          </Link>
        ))}
      </section>

    </div>
  );
}
