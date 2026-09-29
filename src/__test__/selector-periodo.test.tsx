// src/__test__/SelectorPeriodo.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as kpis from "../lib/kpis";


vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("../lib/kpis", () => ({
  periodosDisponibles: vi.fn(() => ["2026-08", "2026-07", "2026-06"]),
  etiquetaPeriodo: (p: string) => {
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const [a, m] = p.split("-");
    return `${meses[Number(m) - 1]} ${a}`;
  },
}));

import { SelectorPeriodo } from "../app/panel/dashboard/SelectorPeriodo";

describe("SelectorPeriodo", () => {
  it("renderiza un enlace por periodo disponible", () => {
    render(<SelectorPeriodo ruta="/panel/dashboard" actual="2026-08" />);
    expect(screen.getByText("agosto 2026")).toBeTruthy();
    expect(screen.getByText("julio 2026")).toBeTruthy();
    expect(screen.getByText("junio 2026")).toBeTruthy();
  });

  it("el periodo actual apunta a la ruta sin query", () => {
    render(<SelectorPeriodo ruta="/panel/dashboard" actual="2026-08" />);
    const link = screen.getByText("agosto 2026").closest("a");
    expect(link?.getAttribute("href")).toBe("/panel/dashboard");
  });

  it("los demás periodos llevan ?periodo=", () => {
    render(<SelectorPeriodo ruta="/panel/dashboard" actual="2026-08" />);
    const link = screen.getByText("julio 2026").closest("a");
    expect(link?.getAttribute("href")).toBe("/panel/dashboard?periodo=2026-07");
  });

  it("marca aria-current='true' en el activo", () => {
    render(<SelectorPeriodo ruta="/panel/dashboard" actual="2026-08" />);
    const activo = screen.getByText("agosto 2026").closest("a");
    expect(activo?.getAttribute("aria-current")).toBe("true");
    const inactivo = screen.getByText("julio 2026").closest("a");
    expect(inactivo?.getAttribute("aria-current")).toBeNull();
  });

  it("el nav tiene aria-label", () => {
    render(<SelectorPeriodo ruta="/panel/dashboard" actual="2026-08" />);
    expect(screen.getByRole("navigation", { name: /Periodo de análisis/i })).toBeTruthy();
  });

  it("sin periodos disponibles no renderiza enlaces", () => {
    vi.mocked(kpis.periodosDisponibles).mockReturnValueOnce([]);
    render(<SelectorPeriodo ruta="/panel/dashboard" actual="2026-08" />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});