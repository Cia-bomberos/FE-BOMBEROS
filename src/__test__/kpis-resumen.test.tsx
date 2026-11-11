import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { KpisResumen } from "../app/panel/bandeja-documental/KpisResumen";
import type { KpisBandeja, PuntoMensual } from "@/lib/resumen-bandeja";

const base: KpisBandeja = {
  ingresosMes: 0,
  variacionIngresos: -100,
  porAtender: 61,
  vencidos: 39,
  atendidos: 31,
  total: 92,
};

const octubre: PuntoMensual = { mes: "Oct", anio: 2026, valor: 20 };

const cifra = (etiqueta: string) => screen.getByText(etiqueta).closest("article")!;
const anillo = (nombre: string | RegExp) => screen.getByRole("img", { name: nombre });
const proporcion = (nombre: string | RegExp) =>
  Number.parseFloat(anillo(nombre).querySelector("[stroke-dasharray]")!.getAttribute("stroke-dasharray")!) / 100;

describe("KpisResumen", () => {
  afterEach(cleanup);

  it("muestra cifra y nota de cada indicador", () => {
    render(<KpisResumen kpis={base} previo={octubre} />);
    expect(cifra("Ingresos").textContent).toContain("Este mes");
    expect(cifra("Por atender").textContent).toContain("61");
    expect(cifra("Por atender").textContent).toContain("39 con plazo vencido");
    expect(cifra("Atendidos").textContent).toContain("31");
    expect(cifra("Atendidos").textContent).toContain("De 92 documentos");
  });

  /* ---------------- Variación ---------------- */

  it("compara una baja con el mes anterior", () => {
    render(<KpisResumen kpis={base} previo={octubre} />);
    expect(cifra("Ingresos").textContent).toContain("−100% vs. Oct");
  });

  it("marca una subida con signo positivo", () => {
    render(<KpisResumen kpis={{ ...base, variacionIngresos: 25 }} previo={octubre} />);
    expect(cifra("Ingresos").textContent).toContain("+25% vs. Oct");
  });

  it("omite la variación si el mes anterior no tuvo ingresos", () => {
    render(<KpisResumen kpis={{ ...base, variacionIngresos: null }} previo={octubre} />);
    expect(cifra("Ingresos").textContent).not.toContain("%");
  });

  it("muestra la variación aunque no se conozca el mes anterior", () => {
    render(<KpisResumen kpis={base} previo={null} />);
    expect(cifra("Ingresos").textContent).toContain("−100%");
    expect(cifra("Ingresos").textContent).not.toContain("vs.");
  });

  it("sin vencidos lo dice sin alertar", () => {
    render(<KpisResumen kpis={{ ...base, vencidos: 0 }} previo={octubre} />);
    expect(cifra("Por atender").textContent).toContain("Ninguno vencido");
    expect(screen.queryByText(/^\d+ con plazo vencido$/)).toBeNull();
  });

  /* ---------------- Anillos de proporción ---------------- */

  it("el anillo de Ingresos compara con el mes anterior", () => {
    render(<KpisResumen kpis={{ ...base, ingresosMes: 5 }} previo={octubre} />);
    expect(proporcion("5 ingresos este mes frente a 20 en Oct")).toBe(0.25);
  });

  it("el anillo de Ingresos se llena si el mes supera al anterior", () => {
    render(<KpisResumen kpis={{ ...base, ingresosMes: 30 }} previo={octubre} />);
    expect(proporcion(/^30 ingresos/)).toBe(1);
  });

  it("el anillo de Ingresos queda vacío sin ingresos este mes", () => {
    render(<KpisResumen kpis={base} previo={octubre} />);
    expect(proporcion(/^0 ingresos/)).toBe(0);
  });

  it("sin mes anterior describe solo el mes actual", () => {
    render(<KpisResumen kpis={{ ...base, ingresosMes: 3 }} previo={null} />);
    expect(proporcion("3 ingresos este mes")).toBe(1);
  });

  it("el anillo de Por atender muestra lo vencido, en alerta", () => {
    render(<KpisResumen kpis={base} previo={octubre} />);
    const nombre = "39 de 61 por atender con plazo vencido";
    expect(proporcion(nombre)).toBeCloseTo(39 / 61);
    expect(anillo(nombre).getAttribute("data-tono")).toBe("alerta");
  });

  it("el anillo de Atendidos muestra el avance, en verde", () => {
    render(<KpisResumen kpis={base} previo={octubre} />);
    const nombre = "31 de 92 documentos atendidos";
    expect(proporcion(nombre)).toBeCloseTo(31 / 92);
    expect(anillo(nombre).getAttribute("data-tono")).toBe("atendido");
  });

  it("un solo vencido entre muchos sigue viéndose", () => {
    render(<KpisResumen kpis={{ ...base, porAtender: 1000, vencidos: 1 }} previo={octubre} />);
    expect(proporcion(/^1 de 1000/)).toBe(0.015);
  });

  it("sin documentos no divide entre cero", () => {
    render(<KpisResumen kpis={{ ...base, atendidos: 0, total: 0 }} previo={octubre} />);
    expect(proporcion("0 de 0 documentos atendidos")).toBe(0);
  });
});
