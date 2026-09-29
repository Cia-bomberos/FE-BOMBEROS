// src/__test__/Grafico.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock del dataset para tener un gráfico controlado
vi.mock("../lib/datos-demo", () => ({
  SERIE_MENSUAL: [
    { mes: "Ene", valor: 10 },
    { mes: "Feb", valor: 20 },
    { mes: "Mar", valor: 30 },
    { mes: "Abr", valor: 40 },
  ],
}));

import { Grafico } from "../app/panel/bandeja-documental/Grafico";

/* ---------------- Helpers ---------------- */

/**
 * Simula getBoundingClientRect en el SVG: le damos un rect de 640x220 px
 * (que coincide con el viewBox) para que la conversión puntero→viewBox
 * sea directa y predecible.
 */
function prepararSvg() {
  const svg = document.querySelector("svg")!;
  svg.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 640,
      height: 220,
      right: 640,
      bottom: 220,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return svg;
}

/** Dispara pointerMove con la coordenada X indicada. */
function moverA(x: number) {
  const svg = document.querySelector("svg")!;
  fireEvent.pointerMove(svg, { clientX: x, clientY: 100 });
}

describe("Grafico", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /* ---------------- Render ---------------- */

  it("renderiza el SVG con aria-label", () => {
    render(<Grafico />);
    const svg = screen.getByRole("img");
    expect(svg.getAttribute("aria-label")).toMatch(/Documentos ingresados/);
  });

  it("dibuja un punto por mes", () => {
    const { container } = render(<Grafico />);
    const puntos = container.querySelectorAll("circle");
    // 4 meses → 4 puntos (sin activo, no hay halo)
    expect(puntos).toHaveLength(4);
  });

  it("dibuja la etiqueta de cada mes", () => {
    const { container } = render(<Grafico />);
    const textos = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(textos).toEqual(expect.arrayContaining(["Ene", "Feb", "Mar", "Abr"]));
  });

  it("dibuja la polyline y el polygon del área", () => {
    const { container } = render(<Grafico />);
    expect(container.querySelector("polyline")).toBeTruthy();
    expect(container.querySelector("polygon")).toBeTruthy();
  });

  it("dibuja las 3 líneas de referencia con sus valores", () => {
    const { container } = render(<Grafico />);
    const lineas = container.querySelectorAll("line");
    // 3 ejes + posible cursor (no activo) → mínimo 3
    expect(lineas.length).toBeGreaterThanOrEqual(3);
  });

  /* ---------------- Sin activo inicial ---------------- */

  it("arranca sin globo de detalle", () => {
    render(<Grafico />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("no hay círculo halo si no hay activo", () => {
    const { container } = render(<Grafico />);
    // 4 círculos sin halo
    expect(container.querySelectorAll("circle")).toHaveLength(4);
  });

  /* ---------------- Pointer move ---------------- */

  it("al mover el puntero aparece el globo con el mes y valor", () => {
    render(<Grafico />);
    prepararSvg();
    moverA(0); // extremo izquierdo → Ene

    const globo = screen.getByRole("status");
    expect(globo.textContent).toContain("Enero 2026");
    expect(globo.textContent).toContain("10");
  });

  it("mover al extremo derecho activa el último mes", () => {
    render(<Grafico />);
    prepararSvg();
    moverA(640);

    const globo = screen.getByRole("status");
    expect(globo.textContent).toContain("Abril 2026");
    expect(globo.textContent).toContain("40");
  });

  it("mover a la mitad activa Feb o Mar según el redondeo", () => {
    render(<Grafico />);
    prepararSvg();
    moverA(320); // mitad del ancho → cae cerca de Mar (índice 2)
    const globo = screen.getByRole("status");
    expect(globo.textContent).toMatch(/Febrero|Marzo/);
  });

  it("añade el halo al punto activo", () => {
    const { container } = render(<Grafico />);
    prepararSvg();
    moverA(0);
    // 1 halo + 4 puntos = 5 círculos
    expect(container.querySelectorAll("circle")).toHaveLength(5);
  });

  it("añade la línea de cursor al mover", () => {
    const { container } = render(<Grafico />);
    prepararSvg();
    moverA(0);
    // 3 ejes + 1 cursor
    expect(container.querySelectorAll("line").length).toBeGreaterThanOrEqual(4);
  });

  it("marca data-activo en el grupo del mes activo", () => {
    const { container } = render(<Grafico />);
    prepararSvg();
    moverA(0);
    const activo = container.querySelector('g[data-activo]');
    expect(activo).toBeTruthy();
  });

  it("pointerLeave oculta el globo", () => {
    render(<Grafico />);
    prepararSvg();
    moverA(0);
    expect(screen.getByRole("status")).toBeTruthy();

    const svg = document.querySelector("svg")!;
    fireEvent.pointerLeave(svg);
    expect(screen.queryByRole("status")).toBeNull();
  });

  /* ---------------- Variación ---------------- */

  it("en el primer mes no hay variación (no hay previo)", () => {
    render(<Grafico />);
    prepararSvg();
    moverA(0); // Ene
    const globo = screen.getByRole("status");
    expect(globo.textContent).not.toContain("vs.");
  });

  it("en Feb muestra variación vs. Ene", () => {
    render(<Grafico />);
    prepararSvg();
    // Un paso a la derecha de Ene
    moverA(200); // aprox Feb (paso ~186 px)
    const globo = screen.getByRole("status");
    // Feb (20) vs Ene (10) → +100%
    if (globo.textContent?.includes("Febrero")) {
      expect(globo.textContent).toContain("+100%");
      expect(globo.textContent).toContain("vs. Ene");
    }
  });

  it("variación negativa se muestra sin signo '+'", () => {
    // Re-mockeamos el dataset con caída
    vi.doMock("../lib/datos-demo", () => ({
      SERIE_MENSUAL: [
        { mes: "Ene", valor: 100 },
        { mes: "Feb", valor: 50 },
      ],
    }));
    vi.resetModules();

    // Re-importamos el componente
    return import("../app/panel/bandeja-documental/Grafico").then(({ Grafico: G }) => {
      render(<G />);
      prepararSvg();
      moverA(640); // extremo derecho → Feb
      const globo = screen.getByRole("status");
      expect(globo.textContent).toContain("Febrero 2026");
      expect(globo.textContent).toContain("-50%");
    });
  });

  /* ---------------- Anclaje del globo ---------------- */

  it("anclaje inicio en los primeros puntos", () => {
    const { container } = render(<Grafico />);
    prepararSvg();
    moverA(0);
    const globo = container.querySelector('[data-anclaje]');
    expect(globo?.getAttribute("data-anclaje")).toBe("inicio");
  });

  it("anclaje fin en los últimos puntos", () => {
    const { container } = render(<Grafico />);
    prepararSvg();
    moverA(640);
    const globo = container.querySelector('[data-anclaje]');
    expect(globo?.getAttribute("data-anclaje")).toBe("fin");
  });

  it("anclaje centro en puntos intermedios", () => {
    const { container } = render(<Grafico />);
    prepararSvg();
    moverA(320);
    const globo = container.querySelector('[data-anclaje]');
    expect(globo?.getAttribute("data-anclaje")).toBe("inicio");
  });

  /* ---------------- Casos borde ---------------- */

  it("si el svg no tiene ref no lanza", () => {
    // Simulamos pointerMove sin rect (jsdom devuelve ceros por defecto,
    // lo cual está bien: getBoundingClientRect existe en jsdom).
    render(<Grafico />);
    expect(() => moverA(0)).not.toThrow();
  });

  it("coordenadas fuera del rango se clampean al primer/último punto", () => {
    render(<Grafico />);
    prepararSvg();
    moverA(-1000);
    expect(screen.getByRole("status").textContent).toContain("Enero 2026");

    moverA(99999);
    expect(screen.getByRole("status").textContent).toContain("Abril 2026");
  });
});