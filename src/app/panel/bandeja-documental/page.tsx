import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listarDocumentos } from "@/lib/documentos-repo";
import { documentosVisibles, puedeRegistrar } from "@/lib/permisos-documentos";
import { hoyLima, parsearFecha } from "@/lib/plazos";
import { distribucionTipos, kpisBandeja, resumenSerie, serieMensual } from "@/lib/resumen-bandeja";
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
  const hoy = parsearFecha(hoyLima()) ?? new Date();

  const kpis = kpisBandeja(DOCUMENTOS, hoy);
  const serie = serieMensual(DOCUMENTOS, hoy);
  const resumen = resumenSerie(serie);
  const tipos = distribucionTipos(DOCUMENTOS);

  const tarjetasKpi = [
    {
      clave: "ingresos",
      etiqueta: "Ingresos",
      valor: kpis.ingresosMes,
      nota: "Este mes",
      variacion: kpis.variacionIngresos,
    },
    {
      clave: "pendientes",
      etiqueta: "Por atender",
      valor: kpis.porAtender,
      nota: kpis.vencidos > 0 ? `${kpis.vencidos} con plazo vencido` : "Ninguno vencido",
      variacion: null,
    },
    {
      clave: "atendidos",
      etiqueta: "Atendidos",
      valor: kpis.atendidos,
      nota: `De ${kpis.total} documentos`,
      variacion: null,
    },
  ];

  const tira = [
    { etiqueta: "Total del período", valor: `${resumen.total}`, sufijo: "docs" },
    { etiqueta: "Promedio mensual", valor: `${resumen.promedio}`, sufijo: "docs" },
    {
      etiqueta: "Mes con más carga",
      valor: resumen.pico?.mes ?? "—",
      sufijo: resumen.pico ? `${resumen.pico.valor}` : "",
    },
    {
      etiqueta: "Variación mensual",
      valor:
        resumen.variacion === null ? "—" : `${resumen.variacion > 0 ? "+" : ""}${resumen.variacion}%`,
      sufijo: resumen.previo ? `vs. ${resumen.previo.mes}` : "",
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
        {tarjetasKpi.map((kpi) => (
          <article
            key={kpi.clave}
            className={styles.kpi}
            style={{ "--tono": TONOS[kpi.clave] } as React.CSSProperties}
          >
            <span className={styles.kpiEtiqueta}>{kpi.etiqueta}</span>
            <span className={styles.kpiValor}>{kpi.valor}</span>
            <span className={styles.kpiPie}>
              {kpi.nota}
              {kpi.variacion !== null && (
                <span
                  className={`${styles.kpiVariacion} ${
                    kpi.variacion >= 0 ? styles.subeBien : styles.bajaMal
                  }`}
                >
                  {kpi.variacion >= 0 ? "▲" : "▼"} {Math.abs(kpi.variacion)}%
                </span>
              )}
            </span>
          </article>
        ))}
      </section>

      <section className={styles.panelesDatos}>
        <article className={`${styles.tarjeta} ${styles.tarjetaGrafico}`}>
          <div className={styles.tarjetaEncabezado}>
            <h2 className={styles.tarjetaTitulo}>Documentos por mes</h2>
            <span className={styles.tarjetaNota}>
              {serie[0].mes} {serie[0].anio} – {serie.at(-1)?.mes} {serie.at(-1)?.anio}
            </span>
          </div>

          <div className={styles.zonaGrafico}>
            <Grafico serie={serie} />
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
            <span className={styles.tarjetaNota}>Sobre {kpis.total} ingresos</span>
          </div>
          {tipos.length === 0 ? (
            <p className={styles.vacio}>Aún no hay documentos registrados.</p>
          ) : (
            <div className={styles.barras}>
              {tipos.map((tipo, i) => (
                <div key={tipo.tipo} className={styles.barraFila}>
                  <span>{tipo.tipo}</span>
                  <span className={styles.barraValor}>{tipo.porcentaje}%</span>
                  <span className={styles.barraPista}>
                    <span
                      className={styles.barraRelleno}
                      style={{
                        width: `${tipo.porcentaje}%`,
                        animationDelay: `${i * 90}ms`,
                      }}
                    />
                  </span>
                </div>
              ))}
            </div>
          )}
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
