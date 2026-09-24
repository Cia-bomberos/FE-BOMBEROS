"use client";

import { useRef, useState } from "react";
import styles from "./panel.module.css";

const ANCHO = 640;
const ALTO = 220;
const MARGEN = { top: 16, right: 12, bottom: 28, left: 34 };

export type PuntoSerie = {
  /** Etiqueta corta del eje X ("Mar"). */
  etiqueta: string;
  /** Nombre completo para el globo ("Marzo 2026"). */
  nombre: string;
  valor: number;
};

/**
 * Línea con área y globo al pasar el cursor, el mismo trazado que
 * "Documentos por mes" de la bandeja, generalizado para cualquier serie.
 * SVG sin dependencias; el color lo pone el módulo (`--acento`).
 */
export function GraficoSerie({
  puntos,
  unidad,
  nombreSerie,
  descripcion,
  formatear = (v) => String(v),
}: {
  puntos: PuntoSerie[];
  unidad: string;
  nombreSerie: string;
  descripcion: string;
  formatear?: (valor: number) => string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activo, setActivo] = useState<number | null>(null);

  if (puntos.length === 0) {
    return <p className={styles.vacio}>Sin datos para graficar.</p>;
  }

  const maximo = Math.max(...puntos.map((p) => p.valor), 1) * 1.15;
  const anchoUtil = ANCHO - MARGEN.left - MARGEN.right;
  const altoUtil = ALTO - MARGEN.top - MARGEN.bottom;
  const paso = puntos.length > 1 ? anchoUtil / (puntos.length - 1) : 0;

  const coords = puntos.map((punto, i) => ({
    ...punto,
    x: MARGEN.left + (puntos.length > 1 ? paso * i : anchoUtil / 2),
    y: MARGEN.top + altoUtil - (punto.valor / maximo) * altoUtil,
  }));

  const linea = coords.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${coords[0].x},${MARGEN.top + altoUtil} ${linea} ${
    coords[coords.length - 1].x
  },${MARGEN.top + altoUtil}`;

  const alMover = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || paso === 0) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * ANCHO;
    const indice = Math.round((x - MARGEN.left) / paso);
    setActivo(Math.min(coords.length - 1, Math.max(0, indice)));
  };

  const punto = activo === null ? null : coords[activo];
  const previo = activo === null || activo === 0 ? null : coords[activo - 1];
  const variacion =
    punto && previo && previo.valor !== 0
      ? Math.round(((punto.valor - previo.valor) / previo.valor) * 100)
      : null;

  const anclaje =
    activo === null
      ? "centro"
      : activo <= 1
        ? "inicio"
        : activo >= coords.length - 2
          ? "fin"
          : "centro";

  return (
    <div className={styles.graficoEnvoltura}>
      <svg
        ref={svgRef}
        className={styles.grafico}
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        role="img"
        aria-label={descripcion}
        onPointerMove={alMover}
        onPointerLeave={() => setActivo(null)}
      >
        <defs>
          <linearGradient id="degradadoArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--acento)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--acento)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((r) => {
          const y = MARGEN.top + altoUtil * r;
          return (
            <g key={r}>
              <line className={styles.graficoEje} x1={MARGEN.left} y1={y} x2={ANCHO - MARGEN.right} y2={y} />
              <text className={styles.graficoTexto} x={0} y={y + 3}>
                {formatear(Math.round(maximo * (1 - r)))}
              </text>
            </g>
          );
        })}

        <polygon className={styles.graficoRelleno} points={area} />
        <polyline className={styles.graficoLinea} points={linea} />

        {punto && (
          <line className={styles.graficoCursor} x1={punto.x} y1={MARGEN.top} x2={punto.x} y2={MARGEN.top + altoUtil} />
        )}

        {coords.map((p, i) => (
          <g key={p.etiqueta} data-activo={i === activo ? "" : undefined}>
            {i === activo && <circle className={styles.graficoHalo} cx={p.x} cy={p.y} r={9} />}
            <circle className={styles.graficoPunto} cx={p.x} cy={p.y} r={i === activo ? 4.5 : 3.5} />
            <text className={styles.graficoTexto} x={p.x} y={ALTO - 8} textAnchor="middle">
              {p.etiqueta}
            </text>
          </g>
        ))}

        <rect x={MARGEN.left} y={MARGEN.top} width={anchoUtil} height={altoUtil} fill="transparent" />
      </svg>

      {punto && (
        <div
          className={styles.graficoGlobo}
          data-anclaje={anclaje}
          style={{ left: `${(punto.x / ANCHO) * 100}%`, top: `${(punto.y / ALTO) * 100}%` }}
          role="status"
        >
          <span className={styles.graficoGloboTitulo}>{punto.nombre}</span>
          <span className={styles.graficoGloboFila}>
            <i className={styles.graficoGloboMuestra} />
            <span>{nombreSerie}</span>
            <strong>
              {formatear(punto.valor)} {unidad}
            </strong>
          </span>
          {variacion !== null && previo && (
            <span className={styles.graficoGloboFila}>
              <i className={styles.graficoGloboMuestra} data-neutro="" />
              <span>vs. {previo.etiqueta}</span>
              <strong data-tendencia={variacion >= 0 ? "sube" : "baja"}>
                {variacion > 0 ? "+" : ""}
                {variacion}%
              </strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
