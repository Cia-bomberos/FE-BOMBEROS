// src/__test__/resumen-bandeja.test.ts
import { describe, expect, it } from "vitest";
import {
  distribucionTipos,
  kpisBandeja,
  resumenSerie,
  serieMensual,
} from "../lib/resumen-bandeja";

const HOY = new Date(2026, 9, 15); // 15/10/2026

const doc = (campos: Record<string, unknown> = {}) =>
  ({
    tipo: "Oficio",
    estado: "Pendiente",
    fechaIngreso: "10/10/2026",
    plazo: "30/12/2026",
    ...campos,
  }) as any;

describe("serieMensual", () => {
  it("devuelve los últimos 6 meses hasta el actual, en orden", () => {
    const serie = serieMensual([], HOY);
    expect(serie.map((p) => `${p.mes} ${p.anio}`)).toEqual([
      "May 2026", "Jun 2026", "Jul 2026", "Ago 2026", "Sep 2026", "Oct 2026",
    ]);
    expect(serie.every((p) => p.valor === 0)).toBe(true);
  });

  it("cruza el cambio de año", () => {
    const serie = serieMensual([], new Date(2026, 1, 3), 3);
    expect(serie.map((p) => `${p.mes} ${p.anio}`)).toEqual(["Dic 2025", "Ene 2026", "Feb 2026"]);
  });

  it("cuenta por fecha de ingreso e ignora lo que queda fuera de la ventana", () => {
    const serie = serieMensual(
      [
        doc({ fechaIngreso: "01/10/2026" }),
        doc({ fechaIngreso: "31/10/2026" }),
        doc({ fechaIngreso: "15/09/2026" }),
        doc({ fechaIngreso: "15/10/2025" }), // mismo mes, otro año
        doc({ fechaIngreso: "" }),
      ],
      HOY,
    );
    expect(serie.at(-1)?.valor).toBe(2);
    expect(serie.at(-2)?.valor).toBe(1);
    expect(serie.reduce((s, p) => s + p.valor, 0)).toBe(3);
  });
});

describe("kpisBandeja", () => {
  it("separa por atender, vencidos y atendidos", () => {
    const kpis = kpisBandeja(
      [
        doc({ estado: "Pendiente", plazo: "01/10/2026" }), // vencido
        doc({ estado: "En proceso" }),
        doc({ estado: "Atendido", plazo: "01/01/2026" }), // cerrado: no cuenta como vencido
        doc({ estado: "Archivado" }),
      ],
      HOY,
    );
    expect(kpis).toMatchObject({ porAtender: 2, vencidos: 1, atendidos: 2, total: 4 });
  });

  it("compara los ingresos del mes con el anterior", () => {
    const kpis = kpisBandeja(
      [doc(), doc(), doc(), doc({ fechaIngreso: "05/09/2026" }), doc({ fechaIngreso: "06/09/2026" })],
      HOY,
    );
    expect(kpis.ingresosMes).toBe(3);
    expect(kpis.variacionIngresos).toBe(50);
  });

  it("sin ingresos el mes anterior no inventa una variación", () => {
    expect(kpisBandeja([doc()], HOY).variacionIngresos).toBeNull();
  });
});

describe("resumenSerie", () => {
  const serie = [
    { mes: "Ago", anio: 2026, valor: 2 },
    { mes: "Sep", anio: 2026, valor: 6 },
    { mes: "Oct", anio: 2026, valor: 4 },
  ];

  it("calcula total, promedio, pico y variación del último mes", () => {
    expect(resumenSerie(serie)).toEqual({
      total: 12,
      promedio: 4,
      pico: serie[1],
      variacion: -33,
      previo: serie[1],
    });
  });

  it("sin documentos no hay pico ni variación", () => {
    const vacia = serie.map((p) => ({ ...p, valor: 0 }));
    expect(resumenSerie(vacia)).toMatchObject({ total: 0, promedio: 0, pico: null, variacion: null });
  });
});

describe("distribucionTipos", () => {
  it("ordena de mayor a menor con porcentajes", () => {
    expect(
      distribucionTipos([doc(), doc(), doc({ tipo: "Informe" }), doc({ tipo: "Externo" })]),
    ).toEqual([
      { tipo: "Oficio", cantidad: 2, porcentaje: 50 },
      { tipo: "Informe", cantidad: 1, porcentaje: 25 },
      { tipo: "Externo", cantidad: 1, porcentaje: 25 },
    ]);
  });

  it("agrupa en 'Otros' lo que pasa del máximo", () => {
    const tipos = ["A", "A", "A", "B", "B", "C", "D", "E"].map((tipo) => doc({ tipo }));
    const filas = distribucionTipos(tipos, 3);
    expect(filas.map((f) => [f.tipo, f.cantidad])).toEqual([["A", 3], ["B", 2], ["Otros", 3]]);
  });

  it("sin documentos devuelve una lista vacía", () => {
    expect(distribucionTipos([])).toEqual([]);
  });
});
