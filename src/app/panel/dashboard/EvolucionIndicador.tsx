"use client";

import { useState } from "react";
import { Desplegable } from "@/components/ui/desplegable";
import { GraficoSerie, type PuntoSerie } from "../GraficoSerie";
import styles from "../panel.module.css";

export type SerieIndicador = {
  clave: string;
  nombre: string;
  unidad: string;
  seccion: string;
  puntos: PuntoSerie[];
};

/**
 * "Ver gráficas" de la vista general: evolución mensual del indicador
 * elegido, con el mismo trazado que "Documentos por mes" de la bandeja.
 */
export function EvolucionIndicador({ series }: { series: SerieIndicador[] }) {
  const [clave, setClave] = useState(series[0]?.clave ?? "");
  const serie = series.find((s) => s.clave === clave) ?? series[0];

  if (!serie) {
    return <p className={styles.vacio}>Sin indicadores con historial.</p>;
  }

  const formatear = (v: number) =>
    serie.unidad === "S/"
      ? v.toLocaleString("es-PE")
      : v.toLocaleString("es-PE", { maximumFractionDigits: 1 });

  const valores = serie.puntos.map((p) => p.valor);
  const ultimo = serie.puntos[serie.puntos.length - 1];
  const previo = serie.puntos[serie.puntos.length - 2];
  const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
  const pico = serie.puntos.reduce((a, b) => (b.valor > a.valor ? b : a));
  const variacion =
    previo && previo.valor !== 0
      ? Math.round(((ultimo.valor - previo.valor) / previo.valor) * 100)
      : null;

  const tira = [
    { etiqueta: "Último mes", valor: formatear(ultimo.valor), sufijo: serie.unidad },
    { etiqueta: "Promedio del período", valor: formatear(Math.round(promedio * 10) / 10), sufijo: serie.unidad },
    { etiqueta: "Mes más alto", valor: pico.etiqueta, sufijo: `${formatear(pico.valor)} ${serie.unidad}` },
    {
      etiqueta: "Variación mensual",
      valor: variacion === null ? "—" : `${variacion > 0 ? "+" : ""}${variacion}%`,
      sufijo: previo ? `vs. ${previo.etiqueta}` : "",
    },
  ];

  return (
    <>
      <div className={styles.selectorIndicador}>
        <label className={styles.campoEtiqueta} htmlFor="indicador">
          Indicador
        </label>
        <Desplegable
          id="indicador"
          className={styles.selectorControl}
          valor={serie.clave}
          onCambio={setClave}
          opciones={series.map((s) => ({ valor: s.clave, texto: s.nombre, grupo: s.seccion }))}
        />
        <span className={styles.selectorSeccion}>{serie.seccion}</span>
      </div>

      <div className={styles.zonaGrafico}>
        <GraficoSerie
          key={serie.clave}
          puntos={serie.puntos}
          unidad={serie.unidad}
          nombreSerie={serie.nombre}
          descripcion={`${serie.nombre} por mes, ${serie.puntos[0].nombre} a ${ultimo.nombre}`}
          formatear={formatear}
        />
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
    </>
  );
}
