// src/__test__/EvolucionIndicador.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Desplegable simplificado
vi.mock("../components/ui/desplegable", () => ({
  Desplegable: ({ valor, opciones, onCambio }: any) => (
    <select
      data-testid="selector-indicador"
      value={valor}
      onChange={(e) => onCambio(e.target.value)}
    >
      {opciones.map((o: any) => (
        <option key={o.valor} value={o.valor}>
          {o.texto}
        </option>
      ))}
    </select>
  ),
}));

// GraficoSerie: stub
vi.mock("../app/panel/GraficoSerie", () => ({
  GraficoSerie: ({ nombreSerie, unidad }: any) => (
    <div data-testid="grafico">
      {nombreSerie} ({unidad})
    </div>
  ),
}));

import { EvolucionIndicador } from "../app/panel/dashboard/EvolucionIndicador";

const serie = (extra: any = {}) => ({
  clave: "documentos-atendidos",
  nombre: "Documentos atendidos",
  unidad: "%",
  seccion: "Administración",
  puntos: [
    { nombre: "oct 2025", etiqueta: "oct 2025", valor: 60 },
    { nombre: "nov 2025", etiqueta: "nov 2025", valor: 70 },
    { nombre: "dic 2025", etiqueta: "dic 2025", valor: 80 },
  ],
  ...extra,
});

describe("EvolucionIndicador", () => {
  it("sin series muestra mensaje vacío", () => {
    render(<EvolucionIndicador series={[]} />);
    expect(screen.getByText(/Sin indicadores con historial/)).toBeTruthy();
  });

  it.each([
    {
      descripcion: "una sola serie",
      series: [serie()],
      expectedValue: "documentos-atendidos",
      expectedOptions: ["documentos-atendidos"],
      expectedGraph: "Documentos atendidos",
      expectedSection: "Administración",
    },
    {
      descripcion: "varias series y cambio de selección",
      series: [
        serie({ clave: "a", nombre: "Indicador A" }),
        serie({ clave: "b", nombre: "Indicador B" }),
      ],
      expectedValue: "a",
      expectedOptions: ["a", "b"],
      expectedGraph: "Indicador A",
      expectedSection: "Administración",
      selectionAfterChange: "b",
      expectedGraphAfterChange: "Indicador B",
    },
  ])("renderiza la serie correcta: $descripcion", ({
    series,
    expectedValue,
    expectedOptions,
    expectedGraph,
    expectedSection,
    selectionAfterChange,
    expectedGraphAfterChange,
  }) => {
    render(<EvolucionIndicador series={series} />);
    const select = screen.getByTestId("selector-indicador") as HTMLSelectElement;

    expect(select.value).toBe(expectedValue);
    expect(Array.from(select.options).map((o) => o.value)).toEqual(expectedOptions);
    expect(screen.getByTestId("grafico").textContent).toContain(expectedGraph);
    expect(screen.getByText(expectedSection)).toBeTruthy();

    if (selectionAfterChange) {
      fireEvent.change(select, { target: { value: selectionAfterChange } });
      expect(select.value).toBe(selectionAfterChange);
      expect(screen.getByTestId("grafico").textContent).toContain(expectedGraphAfterChange);
    }
  });

  /* ---------------- Tira de datos ---------------- */

  it("renderiza las 4 tarjetas de la tira", () => {
    render(<EvolucionIndicador series={[serie()]} />);
    expect(screen.getByText("Último mes")).toBeTruthy();
    expect(screen.getByText("Promedio del período")).toBeTruthy();
    expect(screen.getByText("Mes más alto")).toBeTruthy();
    expect(screen.getByText("Variación mensual")).toBeTruthy();
  });

  it.each([
    {
      descripcion: "último mes",
      titulo: "Último mes",
      expected: "80",
    },
    {
      descripcion: "promedio del período",
      titulo: "Promedio del período",
      expected: "70",
    },
    {
      descripcion: "mes más alto",
      titulo: "Mes más alto",
      expected: "dic 2025",
    },
    {
      descripcion: "variación mensual",
      titulo: "Variación mensual",
      expected: "+14%",
    },
  ])("muestra el valor correcto para $descripcion", ({ titulo, expected }) => {
    render(<EvolucionIndicador series={[serie()]} />);
    expect(screen.getByText(titulo)).toBeTruthy();
    expect(screen.getByText(expected)).toBeTruthy();
  });

  it("variación negativa se muestra con signo", () => {
    const s = serie({
      puntos: [
        { nombre: "oct", etiqueta: "oct", valor: 100 },
        { nombre: "nov", etiqueta: "nov", valor: 80 },
      ],
    });
    render(<EvolucionIndicador series={[s]} />);
    expect(screen.getByText("-20%")).toBeTruthy();
  });

  it("variación con previo 0 muestra '—'", () => {
    const s = serie({
      puntos: [
        { nombre: "oct", etiqueta: "oct", valor: 0 },
        { nombre: "nov", etiqueta: "nov", valor: 50 },
      ],
    });
    render(<EvolucionIndicador series={[s]} />);
    const tarjetaVariacion = screen.getByText("Variación mensual").closest("div");
    expect(tarjetaVariacion?.textContent).toContain("—");
  });

  it("un solo punto → sin variación", () => {
    const s = serie({
      puntos: [{ nombre: "oct", etiqueta: "oct", valor: 40 }],
    });
    render(<EvolucionIndicador series={[s]} />);
    const tarjetaVariacion = screen.getByText("Variación mensual").closest("div");
    expect(tarjetaVariacion?.textContent).toContain("—");
  });

  it("unidad S/ formatea sin decimales", () => {
    const s = serie({
      unidad: "S/",
      puntos: [
        { nombre: "oct", etiqueta: "oct", valor: 12500 },
        { nombre: "nov", etiqueta: "nov", valor: 15000 },
      ],
    });
    render(<EvolucionIndicador series={[s]} />);
    expect(screen.getByText("15,000")).toBeTruthy();
  });

  it("unidad numérica formatea con 1 decimal máx", () => {
    const s = serie({
      unidad: "min",
      puntos: [
        { nombre: "oct", etiqueta: "oct", valor: 4.25 },
        { nombre: "nov", etiqueta: "nov", valor: 5.75 },
      ],
    });
    render(<EvolucionIndicador series={[s]} />);
    expect(screen.getByText("5.8")).toBeTruthy();
  });
});