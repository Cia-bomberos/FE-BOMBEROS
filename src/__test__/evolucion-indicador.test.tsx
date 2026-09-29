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

  it("selecciona la primera serie por defecto", () => {
    render(<EvolucionIndicador series={[serie()]} />);
    const select = screen.getByTestId("selector-indicador") as HTMLSelectElement;
    expect(select.value).toBe("documentos-atendidos");
  });

  it("renderiza el gráfico con la serie seleccionada", () => {
    render(<EvolucionIndicador series={[serie()]} />);
    expect(screen.getByTestId("grafico").textContent).toContain("Documentos atendidos");
    expect(screen.getByTestId("grafico").textContent).toContain("%");
  });

  it("renderiza la sección de la serie", () => {
    render(<EvolucionIndicador series={[serie()]} />);
    expect(screen.getByText("Administración")).toBeTruthy();
  });

  it("lista todas las series en el selector", () => {
    const s1 = serie({ clave: "a", nombre: "Indicador A" });
    const s2 = serie({ clave: "b", nombre: "Indicador B" });
    render(<EvolucionIndicador series={[s1, s2]} />);
    const select = screen.getByTestId("selector-indicador") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(["a", "b"]);
  });

  it("cambiar el selector cambia el gráfico", () => {
    const s1 = serie({ clave: "a", nombre: "Indicador A" });
    const s2 = serie({ clave: "b", nombre: "Indicador B" });
    render(<EvolucionIndicador series={[s1, s2]} />);
    fireEvent.change(screen.getByTestId("selector-indicador"), {
      target: { value: "b" },
    });
    expect(screen.getByTestId("grafico").textContent).toContain("Indicador B");
  });

  /* ---------------- Tira de datos ---------------- */

  it("renderiza las 4 tarjetas de la tira", () => {
    render(<EvolucionIndicador series={[serie()]} />);
    expect(screen.getByText("Último mes")).toBeTruthy();
    expect(screen.getByText("Promedio del período")).toBeTruthy();
    expect(screen.getByText("Mes más alto")).toBeTruthy();
    expect(screen.getByText("Variación mensual")).toBeTruthy();
  });

  it("último mes muestra el último valor", () => {
    render(<EvolucionIndicador series={[serie()]} />);
    expect(screen.getByText("80")).toBeTruthy();
  });

  it("promedio se calcula sobre los puntos", () => {
    render(<EvolucionIndicador series={[serie()]} />);
    // (60 + 70 + 80) / 3 = 70
    expect(screen.getByText("70")).toBeTruthy();
  });

  it("mes más alto apunta al pico", () => {
    render(<EvolucionIndicador series={[serie()]} />);
    expect(screen.getByText("dic 2025")).toBeTruthy();
  });

  it("variación mensual se calcula vs. el mes previo", () => {
    render(<EvolucionIndicador series={[serie()]} />);
    // (80 - 70) / 70 = 14.28... → 14%
    expect(screen.getByText("+14%")).toBeTruthy();
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