import Link from "next/link";
import type { Metadata } from "next";
import { calcularKpi, KPIS, kpisDeSeccion } from "@/lib/kpis";
import { ETIQUETA_FUENTE } from "@/lib/secciones";
import { IconFlecha } from "../iconos";
import { resolverVistaGeneral } from "./acceso";
import { Kpis } from "./Kpis";
import styles from "../panel.module.css";

export const metadata: Metadata = { title: "Dashboard ejecutivo" };

export default async function DashboardEjecutivo() {
  const { secciones, jefatura } = await resolverVistaGeneral();

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
  const calculables = KPIS.filter((kpi) => kpi.fuente !== "registro")
    .filter((kpi) => kpi.secciones.some((s) => secciones.some((v) => v.clave === s)))
    .map(calcularKpi);

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
          <span className={`${styles.chip} ${styles.chipActivo}`}>Este mes</span>
        </div>
      </header>

      <Kpis valores={calculables} />

      <section className={styles.rejilla}>
        {secciones.map((seccion) => (
          <Link
            key={seccion.clave}
            href={seccion.ruta}
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
              {kpisDeSeccion(seccion.clave).map(({ kpi, valor }) => (
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
              {kpisDeSeccion(seccion.clave).length === 0 && (
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
