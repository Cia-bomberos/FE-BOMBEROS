"use client";

import { useRef, useState } from "react";
import { SERIE_MENSUAL } from "@/lib/datos-demo";
import styles from "../panel.module.css";

const ANCHO = 640;
const ALTO = 220;
const MARGEN = { top: 16, right: 12, bottom: 28, left: 30 };

const MESES: Record<string, string> = {
  Ene: "Enero",
  Feb: "Febrero",
  Mar: "Marzo",
  Abr: "Abril",
  May: "Mayo",
  Jun: "Junio",
  Jul: "Julio",
  Ago: "Agosto",
  Sep: "Septiembre",
  Oct: "Octubre",
  Nov: "Noviembre",
  Dic: "Diciembre",
};

/**
 * Evolución mensual de documentos ingresados (SVG, sin dependencias).
 * Al pasar el cursor se marca el mes más cercano y se muestra su detalle.
 */
export function Grafico() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activo, setActivo] = useState<number | null>(null);

  const maximo = Math.max(...SERIE_MENSUAL.map((p) => p.valor)) * 1.15;
  const anchoUtil = ANCHO - MARGEN.left - MARGEN.right;
  const altoUtil = ALTO - MARGEN.top - MARGEN.bottom;

  const puntos = SERIE_MENSUAL.map((punto, i) => ({
    ...punto,
    x: MARGEN.left + (anchoUtil / (SERIE_MENSUAL.length - 1)) * i,
    y: MARGEN.top + altoUtil - (punto.valor / maximo) * altoUtil,
  }));

  const linea = puntos.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${MARGEN.left},${MARGEN.top + altoUtil} ${linea} ${
    MARGEN.left + anchoUtil
  },${MARGEN.top + altoUtil}`;

  const referencias = [0, 0.5, 1];

  // Traduce la posición del puntero (px en pantalla) a la escala del viewBox
  // y elige el punto más cercano en X, como hace el cursor de shadcn/recharts.
  const alMover = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * ANCHO;
    const paso = anchoUtil / (SERIE_MENSUAL.length - 1);
    const indice = Math.round((x - MARGEN.left) / paso);
    setActivo(Math.min(puntos.length - 1, Math.max(0, indice)));
  };

  const punto = activo === null ? null : puntos[activo];
  const previo = activo === null || activo === 0 ? null : puntos[activo - 1];
  const variacion =
    punto && previo
      ? Math.round(((punto.valor - previo.valor) / previo.valor) * 100)
      : null;

  // Cerca de los bordes el globo se ancla al lado contrario para no salirse.
  const anclaje =
    activo === null
      ? "centro"
      : activo <= 1
        ? "inicio"
        : activo >= puntos.length - 2
          ? "fin"
          : "centro";

  return (
    <div className={styles.graficoEnvoltura}>
      <svg
        ref={svgRef}
        className={styles.grafico}
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        role="img"
        aria-label="Documentos ingresados por mes, de enero a agosto de 2026"
        onPointerMove={alMover}
        onPointerLeave={() => setActivo(null)}
      >
        <defs>
          <linearGradient id="degradadoArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--acento)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--acento)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {referencias.map((r) => {
          const y = MARGEN.top + altoUtil * r;
          return (
            <g key={r}>
              <line
                className={styles.graficoEje}
                x1={MARGEN.left}
                y1={y}
                x2={ANCHO - MARGEN.right}
                y2={y}
              />
              <text className={styles.graficoTexto} x={0} y={y + 3}>
                {Math.round(maximo * (1 - r))}
              </text>
            </g>
          );
        })}

        <polygon className={styles.graficoRelleno} points={area} />
        <polyline className={styles.graficoLinea} points={linea} />

        {punto && (
          <line
            className={styles.graficoCursor}
            x1={punto.x}
            y1={MARGEN.top}
            x2={punto.x}
            y2={MARGEN.top + altoUtil}
          />
        )}

        {puntos.map((p, i) => (
          <g key={p.mes} data-activo={i === activo ? "" : undefined}>
            {i === activo && (
              <circle className={styles.graficoHalo} cx={p.x} cy={p.y} r={9} />
            )}
            <circle
              className={styles.graficoPunto}
              cx={p.x}
              cy={p.y}
              r={i === activo ? 4.5 : 3.5}
            />
            <text
              className={styles.graficoTexto}
              x={p.x}
              y={ALTO - 8}
              textAnchor="middle"
            >
              {p.mes}
            </text>
          </g>
        ))}

        {/* Superficie invisible: garantiza que el puntero se capte en todo el
            área del trazado, no solo sobre la línea o los puntos. */}
        <rect
          x={MARGEN.left}
          y={MARGEN.top}
          width={anchoUtil}
          height={altoUtil}
          fill="transparent"
        />
      </svg>

      {punto && (
        <div
          className={styles.graficoGlobo}
          data-anclaje={anclaje}
          style={{
            left: `${(punto.x / ANCHO) * 100}%`,
            top: `${(punto.y / ALTO) * 100}%`,
          }}
          role="status"
        >
          <span className={styles.graficoGloboTitulo}>
            {MESES[punto.mes] ?? punto.mes} 2026
          </span>
          <span className={styles.graficoGloboFila}>
            <i className={styles.graficoGloboMuestra} />
            <span>Documentos</span>
            <strong>{punto.valor}</strong>
          </span>
          {variacion !== null && previo && (
            <span className={styles.graficoGloboFila}>
              <i className={styles.graficoGloboMuestra} data-neutro="" />
              <span>vs. {previo.mes}</span>
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
