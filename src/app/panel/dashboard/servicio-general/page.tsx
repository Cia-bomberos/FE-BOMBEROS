import type { Metadata } from "next";
import {
  INVENTARIO_SERVICIO_GENERAL,
  type EstadoActivo,
} from "@/lib/datos-demo";
import { kpisDeSeccion, resolverPeriodo, resumenServicioGeneral } from "@/lib/kpis";
import { seccionPorClave } from "@/lib/secciones";
import { exigirSeccion } from "../acceso";
import { EncabezadoSeccion } from "../Encabezado";
import { Kpis } from "../Kpis";
import styles from "../../panel.module.css";

export const metadata: Metadata = { title: "Servicio General" };

const CLASES_ESTADO: Record<EstadoActivo, string> = {
  Operativo: styles.estadoAtendido,
  "En reparación": styles.estadoPendiente,
  "De baja": styles.estadoArchivado,
};

type Props = { searchParams: Promise<{ periodo?: string }> };

export default async function ServicioGeneral({ searchParams }: Props) {
  await exigirSeccion("servicio-general");
  const periodo = resolverPeriodo((await searchParams).periodo);
  const valores = await kpisDeSeccion("servicio-general", periodo);
  const seccion = seccionPorClave("servicio-general")!;
  const resumen = resumenServicioGeneral();

  return (
    <div className={`${styles.contenido} ${styles.moduloEjecutivo}`}>
      <EncabezadoSeccion seccion={seccion} periodo={periodo} />

      <Kpis valores={valores} tono={seccion.tono} />

      <section className={styles.tarjeta}>
        <div className={styles.tarjetaEncabezado}>
          <h2 className={styles.tarjetaTitulo}>
            Inventario de mobiliario y suministros
          </h2>
          <span className={styles.tarjetaNota}>
            {resumen.total} registros · {resumen.operativos} operativos ·{" "}
            {resumen.enReparacion} en reparación · {resumen.deBaja} de baja
          </span>
        </div>

        <div className={styles.tablaEnvoltura}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Cantidad</th>
                <th>Ubicación</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {INVENTARIO_SERVICIO_GENERAL.map((activo) => (
                <tr key={activo.codigo}>
                  <td className={styles.celdaNumero}>{activo.codigo}</td>
                  <td className={styles.celdaAsunto}>{activo.descripcion}</td>
                  <td>{activo.categoria}</td>
                  <td>{activo.cantidad}</td>
                  <td>{activo.ubicacion}</td>
                  <td>
                    <span
                      className={`${styles.etiqueta} ${CLASES_ESTADO[activo.estado]}`}
                    >
                      {activo.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className={styles.tarjetaNota} style={{ marginTop: "1rem" }}>
          El diseño (RN-0036) establece este inventario como fuente de los
          indicadores de la sección. El KPI de mantenimientos requiere además un
          programa de mantenimientos que el inventario aún no registra.
        </p>
      </section>
    </div>
  );
}
