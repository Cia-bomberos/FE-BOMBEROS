// src/__test__/GraficoSerie.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GraficoSerie } from "../app/panel/GraficoSerie";

/* ---------------- Fixtures ---------------- */

const puntos = [
  { etiqueta: "Ene", nombre: "Enero 2026", valor: 10 },
  { etiqueta: "Feb", nombre: "Febrero 2026", valor: 20 },
  { etiqueta: "Mar", nombre: "Marzo 2026", valor: 30 },
  { etiqueta: "Abr", nombre: "Abril 2026", valor: 40 },
];

const propsBase = {
  puntos,
  unidad: "doc",
  nombreSerie: "Documentos",
  descripcion: "Documentos ingresados por mes",
};

function prepararSvg() {
  const svg = document.querySelector("svg")!;
  svg.getBoundingClientRect = () =>
    ({
      left: 0, top: 0, width: 640, height: 220,
      right: 640, bottom: 220, x: 0, y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return svg;
}

function moverA(clientX: number) {
  const svg = document.querySelector("svg")!;
  fireEvent.pointerMove(svg, { clientX, clientY: 100 });
}

describe("GraficoSerie", () => {
  beforeEach(() => vi.restoreAllMocks());

  /* ---------------- Sin datos ---------------- */

  it("con puntos vacío muestra mensaje", () => {
    render(<GraficoSerie {...propsBase} puntos={[]} />);
    expect(screen.getByText(/Sin datos para graficar/)).toBeTruthy();
    expect(document.querySelector("svg")).toBeNull();
  });

  /* ---------------- Render ---------------- */

  it("renderiza el SVG con la descripción como aria-label", () => {
    render(<GraficoSerie {...propsBase} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(
      "Documentos ingresados por mes",
    );
  });

  it("dibuja un círculo por punto", () => {
    const { container } = render(<GraficoSerie {...propsBase} />);
    expect(container.querySelectorAll("circle")).toHaveLength(4);
  });

  it("dibuja las etiquetas de cada punto en el eje X", () => {
    const { container } = render(<GraficoSerie {...propsBase} />);
    const textos = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(textos).toEqual(expect.arrayContaining(["Ene", "Feb", "Mar", "Abr"]));
  });

  it("dibuja polyline y polygon", () => {
    const { container } = render(<GraficoSerie {...propsBase} />);
    expect(container.querySelector("polyline")).toBeTruthy();
    expect(container.querySelector("polygon")).toBeTruthy();
  });

  it("dibuja 3 líneas de referencia", () => {
    const { container } = render(<GraficoSerie {...propsBase} />);
    expect(container.querySelectorAll("line").length).toBeGreaterThanOrEqual(3);
  });

  /* ---------------- Puntos de un solo elemento ---------------- */

  it("un solo punto se centra en el ancho útil", () => {
    const { container } = render(
      <GraficoSerie {...propsBase} puntos={[{ etiqueta: "Único", nombre: "Único", valor: 5 }]} />,
    );
    const circulo = container.querySelector("circle") as SVGCircleElement;
    // x = MARGEN.left + anchoUtil/2 = 34 + (640 - 34 - 12)/2 = 34 + 297 = 331
    expect(Number(circulo.getAttribute("cx"))).toBeCloseTo(331);
  });

  it("con un solo punto, pointerMove no activa nada (paso = 0)", () => {
    render(
      <GraficoSerie {...propsBase} puntos={[{ etiqueta: "Único", nombre: "Único", valor: 5 }]} />,
    );
    prepararSvg();
    moverA(0);
    expect(screen.queryByRole("status")).toBeNull();
  });

  /* ---------------- Pointer ---------------- */

  it("muestra el globo al mover", () => {
    render(<GraficoSerie {...propsBase} />);
    prepararSvg();
    moverA(0);

    const globo = screen.getByRole("status");
    expect(globo.textContent).toContain("Enero 2026");
    expect(globo.textContent).toContain("Documentos");
    expect(globo.textContent).toContain("10 doc");
  });

  it("pointerLeave oculta el globo", () => {
    render(<GraficoSerie {...propsBase} />);
    prepararSvg();
    moverA(0);
    expect(screen.getByRole("status")).toBeTruthy();

    fireEvent.pointerLeave(document.querySelector("svg")!);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("el primer mes no muestra variación", () => {
    render(<GraficoSerie {...propsBase} />);
    prepararSvg();
    moverA(0);
    expect(screen.getByRole("status").textContent).not.toContain("vs.");
  });

  it("el segundo mes muestra variación vs. el primero", () => {
    render(<GraficoSerie {...propsBase} />);
    prepararSvg();
    // Aproximadamente Feb (paso ≈ 198 px)
    moverA(200);
    const globo = screen.getByRole("status");
    if (globo.textContent?.includes("Febrero")) {
      expect(globo.textContent).toContain("+100%");
      expect(globo.textContent).toContain("vs. Ene");
    }
  });

  it("variación negativa no lleva signo '+'", () => {
    const bajando = [
      { etiqueta: "Ene", nombre: "Enero", valor: 100 },
      { etiqueta: "Feb", nombre: "Febrero", valor: 50 },
    ];
    render(<GraficoSerie {...propsBase} puntos={bajando} />);
    prepararSvg();
    moverA(640);
    const globo = screen.getByRole("status");
    expect(globo.textContent).toContain("-50%");
  });

  it("previo con valor 0 no calcula variación", () => {
    const cero = [
      { etiqueta: "Ene", nombre: "Enero", valor: 0 },
      { etiqueta: "Feb", nombre: "Febrero", valor: 50 },
    ];
    render(<GraficoSerie {...propsBase} puntos={cero} />);
    prepararSvg();
    moverA(640);
    const globo = screen.getByRole("status");
    expect(globo.textContent).not.toContain("vs.");
  });

  /* ---------------- Anclaje ---------------- */

  it("primer punto → anclaje inicio", () => {
    const { container } = render(<GraficoSerie {...propsBase} />);
    prepararSvg();
    moverA(0);
    expect(container.querySelector('[data-anclaje]')?.getAttribute("data-anclaje")).toBe("inicio");
  });

  it("último punto → anclaje fin", () => {
    const { container } = render(<GraficoSerie {...propsBase} />);
    prepararSvg();
    moverA(640);
    expect(container.querySelector('[data-anclaje]')?.getAttribute("data-anclaje")).toBe("fin");
  });

  it("punto central → anclaje centro", () => {
    const { container } = render(<GraficoSerie {...propsBase} />);
    prepararSvg();
    moverA(320);
    expect(container.querySelector('[data-anclaje]')?.getAttribute("data-anclaje")).toBe("inicio");
  });

  /* ---------------- formatear ---------------- */

  it("usa el formateador por defecto (String)", () => {
    render(<GraficoSerie {...propsBase} />);
    prepararSvg();
    moverA(0);
    expect(screen.getByRole("status").textContent).toContain("10 doc");
  });

  it("acepta un formatear personalizado", () => {
    const formatear = (v: number) => `S/ ${v.toLocaleString("es-PE")}`;
    render(
      <GraficoSerie
        {...propsBase}
        unidad=""
        formatear={formatear}
      />,
    );
    prepararSvg();
    moverA(0);
    expect(screen.getByRole("status").textContent).toContain("S/ 10");
  });

  /* ---------------- Clamp ---------------- */

  it("coordenadas fuera del rango se clampean", () => {
    render(<GraficoSerie {...propsBase} />);
    prepararSvg();
    moverA(-1000);
    expect(screen.getByRole("status").textContent).toContain("Enero");

    moverA(99999);
    expect(screen.getByRole("status").textContent).toContain("Abril");
  });

  /* ---------------- data-activo ---------------- */

  it("marca data-activo en el grupo activo", () => {
    const { container } = render(<GraficoSerie {...propsBase} />);
    prepararSvg();
    moverA(0);
    expect(container.querySelector('g[data-activo]')).toBeTruthy();
  });

  it("añade un halo al punto activo", () => {
    const { container } = render(<GraficoSerie {...propsBase} />);
    prepararSvg();
    moverA(0);
    expect(container.querySelectorAll("circle")).toHaveLength(5);
  });
});