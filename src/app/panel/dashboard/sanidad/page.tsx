import type { Metadata } from "next";
import { INVENTARIO_SANIDAD, type InsumoMedico } from "@/lib/datos-demo";
import { kpisDeSeccion, resumenSanidad } from "@/lib/kpis";
import { seccionPorClave } from "@/lib/secciones";
import { exigirSeccion } from "../acceso";
import { EncabezadoSeccion } from "../Encabezado";
import { Kpis } from "../Kpis";
import styles from "../../panel.module.css";

export const metadata: Metadata = { title: "Sanidad" };

const CLASES_ESTADO: Record<InsumoMedico["estado"], string> = {
  Disponible: styles.estadoAtendido,
  "Bajo stock": styles.estadoPendiente,
  Vencido: styles.estadoArchivado,
};

export default async function Sanidad() {
  await exigirSeccion("sanidad");
  const seccion = seccionPorClave("sanidad")!;
  const resumen = resumenSanidad();
  const alertas = INVENTARIO_SANIDAD.filter((i) => i.estado !== "Disponible");

  return (
    <div className={`${styles.contenido} ${styles.moduloEjecutivo}`}>
      <EncabezadoSeccion seccion={seccion} />

      <Kpis valores={kpisDeSeccion("sanidad")} tono={seccion.tono} />

      <section className={styles.rejilla}>
        <article className={`${styles.tarjeta} ${styles.tarjetaColumna}`}>
          <div className={styles.tarjetaEncabezado}>
            <h2 className={styles.tarjetaTitulo}>Alertas de inventario</h2>
            <span className={styles.tarjetaNota}>
              {resumen.bajoStock} bajo stock · {resumen.vencidos} vencidos
            </span>
          </div>

          {alertas.length === 0 ? (
            <p className={styles.vacio}>Sin alertas en el inventario.</p>
          ) : (
            <div className={styles.progresoLista}>
              {alertas.map((insumo) => (
                <div key={insumo.codigo} className={styles.progresoFila}>
                  <span>
                    {insumo.descripcion}
                    <span className={styles.celdaSecundaria}>
                      {insumo.cantidad} en stock · mínimo {insumo.minimo} ·{" "}
                      {insumo.ubicacion}
                    </span>
                  </span>
                  <span
                    className={`${styles.etiqueta} ${CLASES_ESTADO[insumo.estado]}`}
                  >
                    {insumo.estado}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className={`${styles.tarjetaNota} ${styles.alFondo}`}>
            El catálogo de KPIs no define indicadores propios de Sanidad. El
            diseño (RN-0036) los prevé a partir de este inventario: falta que la
            Compañía los formule.
          </p>
        </article>
      </section>

      <section className={styles.tarjeta}>
        <div className={styles.tarjetaEncabezado}>
          <h2 className={styles.tarjetaTitulo}>Inventario de insumos médicos</h2>
          <span className={styles.tarjetaNota}>
            {resumen.total} registros · base de cálculo
          </span>
        </div>

        <div className={styles.tablaEnvoltura}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Mínimo</th>
                <th>Vence</th>
                <th>Ubicación</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {INVENTARIO_SANIDAD.map((insumo) => (
                <tr key={insumo.codigo}>
                  <td className={styles.celdaNumero}>{insumo.codigo}</td>
                  <td className={styles.celdaAsunto}>{insumo.descripcion}</td>
                  <td>{insumo.cantidad}</td>
                  <td>{insumo.minimo}</td>
                  <td>{insumo.vence}</td>
                  <td>{insumo.ubicacion}</td>
                  <td>
                    <span
                      className={`${styles.etiqueta} ${CLASES_ESTADO[insumo.estado]}`}
                    >
                      {insumo.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
