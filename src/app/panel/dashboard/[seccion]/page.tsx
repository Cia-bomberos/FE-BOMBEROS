import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PERIODO_ACTUAL, REGISTROS_KPI } from "@/lib/datos-demo";
import { etiquetaPeriodo, kpisDeSeccion } from "@/lib/kpis";
import { seccionPorClave, type Seccion } from "@/lib/secciones";
import { exigirSeccion } from "../acceso";
import { EncabezadoSeccion } from "../Encabezado";
import { Kpis } from "../Kpis";
import styles from "../../panel.module.css";

/**
 * Secciones cuyos indicadores se registran por periodo (Instrucción, SSO,
 * Proyectos e Imagen). Comparten esta vista: los KPIs del catálogo y la
 * bitácora de valores cargados. Las secciones con inventario o bandeja
 * tienen su propia página estática, que Next prioriza sobre esta ruta.
 */

type Props = { params: Promise<{ seccion: string }> };

const deRegistro = (clave: string): Seccion | undefined => {
  const seccion = seccionPorClave(clave);
  return seccion?.fuente === "registro" ? seccion : undefined;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { seccion } = await params;
  return { title: deRegistro(seccion)?.nombre ?? "Dashboard" };
}

export default async function SeccionRegistro({ params }: Props) {
  const { seccion: clave } = await params;
  const seccion = deRegistro(clave);
  if (!seccion) notFound();

  await exigirSeccion(seccion.clave);

  const valores = kpisDeSeccion(seccion.clave);
  const claves = new Set(valores.map((v) => v.kpi.clave));
  const historial = REGISTROS_KPI.filter((r) => claves.has(r.kpi)).sort((a, b) =>
    b.periodo.localeCompare(a.periodo),
  );

  return (
    <div className={`${styles.contenido} ${styles.moduloEjecutivo}`}>
      <EncabezadoSeccion seccion={seccion} />

      <Kpis valores={valores} tono={seccion.tono} />

      <section className={styles.tarjeta}>
        <div className={styles.tarjetaEncabezado}>
          <h2 className={styles.tarjetaTitulo}>Valores registrados</h2>
          <span className={styles.tarjetaNota}>
            Periodo vigente: {etiquetaPeriodo(PERIODO_ACTUAL)}
          </span>
        </div>

        {historial.length === 0 ? (
          <p className={styles.vacio}>
            Esta sección aún no ha registrado valores para sus indicadores.
          </p>
        ) : (
          <div className={styles.tablaEnvoltura}>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Indicador</th>
                  <th>Periodo</th>
                  <th>Valor</th>
                  <th>Detalle</th>
                  <th>Registrado por</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((registro) => {
                  const kpi = valores.find((v) => v.kpi.clave === registro.kpi)?.kpi;
                  return (
                    <tr key={`${registro.kpi}-${registro.periodo}`}>
                      <td className={styles.celdaAsunto}>{kpi?.nombre}</td>
                      <td>{etiquetaPeriodo(registro.periodo)}</td>
                      <td className={styles.celdaNumero}>
                        {kpi?.unidad === "S/"
                          ? `S/ ${registro.valor.toLocaleString("es-PE")}`
                          : `${registro.valor.toLocaleString("es-PE")} ${kpi?.unidad ?? ""}`}
                      </td>
                      <td>{registro.detalle ?? "—"}</td>
                      <td>{registro.registradoPor}</td>
                      <td>{registro.fecha}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className={styles.tarjetaNota} style={{ marginTop: "1rem" }}>
          Los valores de esta sección no se derivan de otros módulos: los carga
          el Jefe de Sección cada periodo. El formulario de carga y la
          importación desde Excel se habilitan con el endpoint del gateway.
        </p>
      </section>
    </div>
  );
}
