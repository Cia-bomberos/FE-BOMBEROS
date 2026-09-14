import type { Metadata } from "next";
import { UNIDADES } from "@/lib/datos-demo";
import { kpisDeSeccion } from "@/lib/kpis";
import { seccionPorClave } from "@/lib/secciones";
import { exigirSeccion } from "../acceso";
import { EncabezadoSeccion } from "../Encabezado";
import { Kpis } from "../Kpis";
import styles from "../../panel.module.css";

export const metadata: Metadata = { title: "Máquinas" };

const CLASES_ESTADO = {
  Operativa: styles.unidadOperativa,
  "En mantenimiento": styles.unidadMantenimiento,
  "Fuera de servicio": styles.unidadFuera,
};

const CLASES_SEGMENTO = {
  Operativa: styles.segOperativa,
  "En mantenimiento": styles.segMantenimiento,
  "Fuera de servicio": styles.segFuera,
};

export default async function Maquinas() {
  await exigirSeccion("maquinas");
  const seccion = seccionPorClave("maquinas")!;

  const proximos = UNIDADES.filter((u) =>
    /^\d{2}\/\d{2}\/\d{4}$/.test(u.proximoMantenimiento),
  ).slice(0, 5);

  return (
    <div className={`${styles.contenido} ${styles.moduloEjecutivo}`}>
      <EncabezadoSeccion seccion={seccion} />

      <Kpis valores={kpisDeSeccion("maquinas")} tono={seccion.tono} />

      <section className={styles.tarjeta}>
        <div className={styles.tarjetaEncabezado}>
          <h2 className={styles.tarjetaTitulo}>Inventario de unidades</h2>
          <span className={styles.tarjetaNota}>
            {UNIDADES.length} unidades · base de cálculo de los indicadores
          </span>
        </div>

        <div className={styles.segmentos}>
          {UNIDADES.map((unidad) => (
            <span
              key={unidad.id}
              className={`${styles.segmento} ${CLASES_SEGMENTO[unidad.estado]}`}
              title={`${unidad.id} · ${unidad.estado}`}
            />
          ))}
        </div>

        <div className={styles.tablaEnvoltura} style={{ marginTop: "1.25rem" }}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Unidad</th>
                <th>Tipo</th>
                <th>Conductor asignado</th>
                <th>Kilometraje</th>
                <th>Combustible</th>
                <th>Próx. mantenimiento</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {UNIDADES.map((unidad) => (
                <tr key={unidad.id}>
                  <td className={styles.celdaNumero}>{unidad.id}</td>
                  <td>{unidad.tipo}</td>
                  <td>{unidad.conductor}</td>
                  <td>{unidad.kilometraje.toLocaleString("es-PE")} km</td>
                  <td>{unidad.combustible}%</td>
                  <td>{unidad.proximoMantenimiento}</td>
                  <td>
                    <span className={CLASES_ESTADO[unidad.estado]}>
                      <span
                        className={styles.puntoEstado}
                        style={{ background: "currentColor" }}
                      />
                      {unidad.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.tarjeta}>
        <div className={styles.tarjetaEncabezado}>
          <h2 className={styles.tarjetaTitulo}>Mantenimientos programados</h2>
          <span className={styles.tarjetaNota}>Próximas fechas</span>
        </div>
        <div className={styles.progresoLista}>
          {proximos.map((unidad) => (
            <div key={unidad.id} className={styles.progresoFila}>
              <span>
                {unidad.id} · {unidad.tipo}
              </span>
              <span className={styles.barraValor}>{unidad.proximoMantenimiento}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
