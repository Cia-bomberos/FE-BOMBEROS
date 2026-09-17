import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DISTRIBUCION_TIPOS, KPIS_MESA, SERIE_MENSUAL } from "@/lib/datos-demo";
import { listarDocumentos } from "@/lib/documentos-repo";
import { documentosVisibles, puedeRegistrar } from "@/lib/permisos-documentos";
import { obtenerSesion } from "@/lib/sesion";
import { EtiquetaEstado, EtiquetaPrioridad } from "./Etiquetas";
import { Grafico } from "./Grafico";
import { IconFlecha } from "../iconos";
import styles from "../panel.module.css";

export const metadata: Metadata = { title: "Bandeja Documental" };

const TONOS: Record<string, string> = {
  ingresos: "var(--bleu)",
  pendientes: "var(--ambar)",
  atendidos: "var(--verde)",
};

export default async function MesaDePartes() {
  const bombero = await obtenerSesion();
  if (!bombero) redirect("/login");

  const DOCUMENTOS = documentosVisibles(bombero, await listarDocumentos());
  const recientes = DOCUMENTOS.slice(0, 5);
  const totalTipos = DISTRIBUCION_TIPOS.reduce((s, t) => s + t.valor, 0);

  const totalPeriodo = SERIE_MENSUAL.reduce((s, m) => s + m.valor, 0);
  const promedio = Math.round(totalPeriodo / SERIE_MENSUAL.length);
  const pico = SERIE_MENSUAL.reduce((a, b) => (b.valor > a.valor ? b : a));
  const ultimo = SERIE_MENSUAL[SERIE_MENSUAL.length - 1];
  const previo = SERIE_MENSUAL[SERIE_MENSUAL.length - 2];
  const variacion = Math.round(((ultimo.valor - previo.valor) / previo.valor) * 100);

  const tira = [
    { etiqueta: "Total del período", valor: `${totalPeriodo}`, sufijo: "docs" },
    { etiqueta: "Promedio mensual", valor: `${promedio}`, sufijo: "docs" },
    { etiqueta: "Mes con más carga", valor: pico.mes, sufijo: `${pico.valor}` },
    {
      etiqueta: "Variación mensual",
      valor: `${variacion > 0 ? "+" : ""}${variacion}%`,
      sufijo: `vs. ${previo.mes}`,
    },
  ];

  return (
    <div className={`${styles.contenido} ${styles.moduloMesa}`}>
      <header className={styles.encabezado}>
        <div>
          <h1 className={styles.titulo}>Bandeja Documental</h1>
        </div>
        {puedeRegistrar(bombero) && (
          <Link className={styles.botonPrimario} href="/panel/bandeja-documental/registrar">
            Registrar ingreso
            <IconFlecha width={15} height={15} />
          </Link>
        )}
      </header>

      <section className={styles.kpis}>
        {KPIS_MESA.map((kpi) => {
          const clase = kpi.variacion >= 0 ? styles.subeBien : styles.bajaMal;

          return (
            <article
              key={kpi.clave}
              className={styles.kpi}
              style={{ "--tono": TONOS[kpi.clave] } as React.CSSProperties}
            >
              <span className={styles.kpiEtiqueta}>{kpi.etiqueta}</span>
              <span className={styles.kpiValor}>{kpi.valor}</span>
              <span className={styles.kpiPie}>
                {kpi.nota}
                <span className={`${styles.kpiVariacion} ${clase}`}>
                  {kpi.variacion >= 0 ? "▲" : "▼"} {Math.abs(kpi.variacion)}%
                </span>
              </span>
            </article>
          );
        })}
      </section>

      <section className={styles.panelesDatos}>
        <article className={`${styles.tarjeta} ${styles.tarjetaGrafico}`}>
          <div className={styles.tarjetaEncabezado}>
            <h2 className={styles.tarjetaTitulo}>Documentos por mes</h2>
            <span className={styles.tarjetaNota}>Enero – agosto 2026</span>
          </div>

          <div className={styles.zonaGrafico}>
            <Grafico />
          </div>

          <div className={styles.tiraDatos}>
            {tira.map((dato) => (
              <div key={dato.etiqueta} className={styles.tiraDato}>
                <span className={styles.tiraValor}>
                  {dato.valor} <em>{dato.sufijo}</em>
                </span>
                <span className={styles.tiraEtiqueta}>{dato.etiqueta}</span>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.tarjeta}>
          <div className={styles.tarjetaEncabezado}>
            <h2 className={styles.tarjetaTitulo}>Distribución por tipo</h2>
            <span className={styles.tarjetaNota}>Sobre {totalTipos > 0 ? 128 : 0} ingresos</span>
          </div>
          <div className={styles.barras}>
            {DISTRIBUCION_TIPOS.map((tipo, i) => (
              <div key={tipo.tipo} className={styles.barraFila}>
                <span>{tipo.tipo}</span>
                <span className={styles.barraValor}>{tipo.valor}%</span>
                <span className={styles.barraPista}>
                  <span
                    className={styles.barraRelleno}
                    style={{
                      width: `${tipo.valor}%`,
                      animationDelay: `${i * 90}ms`,
                    }}
                  />
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.tarjeta}>
        <div className={styles.tarjetaEncabezado}>
          <h2 className={styles.tarjetaTitulo}>Documentos recientes</h2>
          <Link className={styles.botonSecundario} href="/panel/bandeja-documental/documentos">
            Ver bandeja completa
          </Link>
        </div>

        <div className={styles.tablaEnvoltura}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Documento</th>
                <th>Asunto</th>
                <th>Área responsable</th>
                <th>Ingreso</th>
                <th>Prioridad</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recientes.map((documento) => (
                <tr key={documento.id}>
                  <td>
                    <Link
                      className={styles.celdaNumero}
                      href={`/panel/bandeja-documental/documentos/${documento.id}`}
                    >
                      {documento.numero}
                    </Link>
                  </td>
                  <td className={styles.celdaAsunto}>{documento.asunto}</td>
                  <td>{documento.destino}</td>
                  <td>{documento.fechaIngreso}</td>
                  <td>
                    <EtiquetaPrioridad prioridad={documento.prioridad} />
                  </td>
                  <td>
                    <EtiquetaEstado estado={documento.estado} />
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
