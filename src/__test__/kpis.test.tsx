// src/__test__/Kpis.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Kpis } from "../app/panel/dashboard/Kpis";
import type { Kpi, ValorKpi } from "../lib/kpis";

const kpi = (extra: Partial<Kpi> = {}): Kpi =>
  ({
    clave: "documentos-atendidos",
    nombre: "Documentos atendidos",
    descripcion: "Porcentaje de cumplimiento",
    formula: "(A ÷ B) × 100",
    unidad: "%",
    area: "Gestión Administrativa",
    seccionOrigen: "Administración",
    secciones: ["administracion"],
    fuente: "documental",
    ...extra,
  }) as Kpi;

const valor = (extra: Partial<ValorKpi> = {}): ValorKpi =>
  ({
    kpi: kpi(),
    valor: "80",
    detalle: "8 de 10 recibidos",
    ...extra,
  }) as ValorKpi;

describe("Kpis", () => {
  it("muestra mensaje vacío si no hay valores", () => {
    render(<Kpis valores={[]} />);
    expect(screen.getByText(/no define ningún KPI/)).toBeTruthy();
  });

  it("renderiza una tarjeta por valor", () => {
    render(<Kpis valores={[valor({ kpi: kpi({ clave: "a", nombre: "A" }) }), valor({ kpi: kpi({ clave: "b", nombre: "B" }) })]} />);
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("B")).toBeTruthy();
  });

  it("usa el nombre como etiqueta y la descripción como title", () => {
    render(<Kpis valores={[valor()]} />);
    expect(screen.getByText("Documentos atendidos")).toBeTruthy();
    const articulo = screen.getByText("Documentos atendidos").closest("article");
    expect(articulo?.getAttribute("title")).toBe("Porcentaje de cumplimiento");
  });

  it("renderiza el valor con la unidad", () => {
    render(<Kpis valores={[valor({ valor: "80" })]} />);
    expect(screen.getByText("80")).toBeTruthy();
    expect(screen.getByText("%")).toBeTruthy();
  });

  it("formatea S/ como prefijo", () => {
    const v = valor({
      kpi: kpi({ unidad: "S/", formula: "Σ" }),
      valor: "12,500",
    });
    render(<Kpis valores={[v]} />);
    expect(screen.getByText("S/")).toBeTruthy();
    expect(screen.getByText("12,500")).toBeTruthy();
  });

  it("renderiza el detalle en el pie", () => {
    render(<Kpis valores={[valor({ detalle: "8 de 10 recibidos" })]} />);
    expect(screen.getByText("8 de 10 recibidos")).toBeTruthy();
  });

  it("renderiza la fórmula", () => {
    render(<Kpis valores={[valor()]} />);
    expect(screen.getByText(/\(A ÷ B\) × 100/)).toBeTruthy();
  });

  it("muestra 'Registró' si viene el campo registro", () => {
    render(
      <Kpis
        valores={[valor({ registro: "Ana · 01/01/2026" })]}
      />,
    );
    expect(screen.getByText(/Registró Ana/)).toBeTruthy();
  });

  it("no muestra 'Registró' si no hay registro", () => {
    render(<Kpis valores={[valor()]} />);
    expect(screen.queryByText(/Registró/)).toBeNull();
  });

  /* ---------------- Valor null ---------------- */

  it("con valor null muestra '—' y el mensaje de sin dato", () => {
    render(
      <Kpis
        valores={[valor({ valor: null, detalle: "Sin valor registrado para enero 2026" })]}
      />,
    );
    expect(screen.getByLabelText("Sin dato")).toBeTruthy();
    expect(screen.getByText(/Sin dato del periodo/)).toBeTruthy();
    expect(screen.getByText(/Sin valor registrado/)).toBeTruthy();
  });

  it("con valor null NO muestra la fórmula", () => {
    render(<Kpis valores={[valor({ valor: null })]} />);
    expect(screen.queryByText(/\(A ÷ B\)/)).toBeNull();
  });

  /* ---------------- Tono ---------------- */

  it("acepta tono como CSS custom property", () => {
    const { container } = render(
      <Kpis valores={[valor()]} tono="var(--bleu)" />,
    );
    const articulo = container.querySelector("article");
    expect(articulo?.getAttribute("style")).toContain("--tono");
  });

  it("sin tono no setea el style de tono", () => {
    const { container } = render(<Kpis valores={[valor()]} />);
    const articulo = container.querySelector("article");
    expect(articulo?.getAttribute("style")).toBeNull();
  });
});