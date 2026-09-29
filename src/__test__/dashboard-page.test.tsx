// src/__test__/dashboard-page.test.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

/* ---------------- Mocks ---------------- */

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/app/panel/dashboard/acceso", () => ({
  resolverVistaGeneral: vi.fn(),
}));

vi.mock("@/app/panel/dashboard/Kpis", () => ({
  Kpis: ({ valores }: any) => (
    <div data-testid="kpis">Kpis ({valores.length})</div>
  ),
}));

vi.mock("@/app/panel/dashboard/EvolucionIndicador", () => ({
  EvolucionIndicador: ({ series }: any) => (
    <div data-testid="evolucion">Series ({series.length})</div>
  ),
}));

vi.mock("@/app/panel/dashboard/SelectorPeriodo", () => ({
  SelectorPeriodo: ({ actual }: any) => (
    <div data-testid="selector-periodo">{actual}</div>
  ),
}));

vi.mock("@/app/panel/iconos", () => ({
  IconFlecha: () => <span data-testid="icon-flecha" />,
}));

// Mock del módulo de KPIs: mantenemos funciones reales solo las que son puras
vi.mock("@/lib/kpis", async () => {
  const real = await vi.importActual<any>("@/lib/kpis");
  return {
    ...real,
    calcularKpi: vi.fn(),
    kpisDeSeccion: vi.fn(),
    resolverPeriodo: vi.fn((p) => p ?? "2026-08"),
    etiquetaPeriodo: vi.fn((p: string) => p),
    serieDeKpi: vi.fn(() => []),
  };
});

vi.mock("@/lib/secciones", () => ({
  ETIQUETA_FUENTE: {
    inventario: "inventario",
    documental: "bandeja",
    registro: "registro",
  },
  seccionPorClave: vi.fn((c) => ({ nombre: c })),
}));

import DashboardEjecutivo from "../app/panel/dashboard/page";
import { resolverVistaGeneral } from "@/app/panel/dashboard/acceso";
import * as kpisMod from "@/lib/kpis";

/* ---------------- Fixtures ---------------- */

const seccionAdmin = {
  clave: "administracion",
  nombre: "Administración",
  ruta: "/panel/dashboard/administracion",
  tono: "var(--bleu)",
  fuente: "documental" as const,
};
const seccionMaquinas = {
  clave: "maquinas",
  nombre: "Máquinas",
  ruta: "/panel/dashboard/maquinas",
  tono: "var(--verde)",
  fuente: "inventario" as const,
};

const valorKpi = (clave: string, valor: string | null) => ({
  kpi: {
    clave,
    nombre: `KPI ${clave}`,
    descripcion: "desc",
    formula: "x",
    unidad: "%",
    area: "Operatividad",
    seccionOrigen: "x",
    secciones: ["administracion"],
    fuente: "documental",
  },
  valor,
  detalle: "detalle",
});

async function renderPage(searchParams: Record<string, string> = {}) {
  const jsx = await DashboardEjecutivo({
    searchParams: Promise.resolve(searchParams),
  });
  return render(jsx as any);
}

describe("dashboard/page.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(kpisMod.calcularKpi).mockResolvedValue(valorKpi("x", "80") as any);
    vi.mocked(kpisMod.kpisDeSeccion).mockResolvedValue([]);
    vi.mocked(kpisMod.serieDeKpi).mockReturnValue([]);
  });

  /* ---------------- Sin secciones ---------------- */

  it("muestra mensaje cuando no hay secciones asignadas", async () => {
    vi.mocked(resolverVistaGeneral).mockResolvedValue({
      bombero: {} as any,
      secciones: [],
      jefatura: false,
    });
    await renderPage();
    expect(screen.getByText(/no tiene una sección asignada/)).toBeTruthy();
    expect(screen.queryByTestId("kpis")).toBeNull();
    expect(screen.queryByTestId("selector-periodo")).toBeNull();
  });

  /* ---------------- Jefatura ---------------- */

  it("jefatura: muestra el subtítulo de vista general", async () => {
    vi.mocked(resolverVistaGeneral).mockResolvedValue({
      bombero: {} as any,
      secciones: [seccionAdmin, seccionMaquinas] as any,
      jefatura: true,
    });
    await renderPage();
    expect(screen.getByText(/Vista general de las 2 secciones/)).toBeTruthy();
  });

  it("jefatura: renderiza una tarjeta por sección", async () => {
    vi.mocked(resolverVistaGeneral).mockResolvedValue({
      bombero: {} as any,
      secciones: [seccionAdmin, seccionMaquinas] as any,
      jefatura: true,
    });
    await renderPage();
    expect(screen.getByText("Administración")).toBeTruthy();
    expect(screen.getByText("Máquinas")).toBeTruthy();
  });

  it("las tarjetas de sección enlazan con ?periodo=", async () => {
    vi.mocked(resolverVistaGeneral).mockResolvedValue({
      bombero: {} as any,
      secciones: [seccionAdmin] as any,
      jefatura: true,
    });
    await renderPage({ periodo: "2026-07" });
    const link = screen.getByText("Administración").closest("a");
    expect(link?.getAttribute("href")).toBe(
      "/panel/dashboard/administracion?periodo=2026-07",
    );
  });

  /* ---------------- No jefatura ---------------- */

  it("no jefatura: subtítulo de secciones a cargo", async () => {
    vi.mocked(resolverVistaGeneral).mockResolvedValue({
      bombero: {} as any,
      secciones: [seccionAdmin] as any,
      jefatura: false,
    });
    await renderPage();
    expect(screen.getByText(/Indicadores de las secciones a su cargo/)).toBeTruthy();
  });

  /* ---------------- Kpis calculables ---------------- */

  it("renderiza el bloque de KPIs calculables", async () => {
    vi.mocked(resolverVistaGeneral).mockResolvedValue({
      bombero: {} as any,
      secciones: [seccionAdmin] as any,
      jefatura: true,
    });
    await renderPage();
    expect(screen.getByTestId("kpis")).toBeTruthy();
  });

  it("muestra el chip con el recuento de calculados/registrados", async () => {
    vi.mocked(resolverVistaGeneral).mockResolvedValue({
      bombero: {} as any,
      secciones: [seccionAdmin] as any,
      jefatura: true,
    });
    await renderPage();
    // El texto depende del catálogo real; verificamos que aparece el patrón
    expect(screen.getByText(/calculados · .* registrados/)).toBeTruthy();
  });

  /* ---------------- Evolución ---------------- */

  it("renderiza el bloque de evolución con las series", async () => {
    vi.mocked(resolverVistaGeneral).mockResolvedValue({
      bombero: {} as any,
      secciones: [seccionAdmin] as any,
      jefatura: true,
    });
    await renderPage();
    expect(screen.getByTestId("evolucion")).toBeTruthy();
  });

  /* ---------------- Selector de periodo ---------------- */

  it("el selector recibe el periodo resuelto", async () => {
    vi.mocked(resolverVistaGeneral).mockResolvedValue({
      bombero: {} as any,
      secciones: [seccionAdmin] as any,
      jefatura: true,
    });
    await renderPage({ periodo: "2026-07" });
    expect(screen.getByTestId("selector-periodo").textContent).toBe("2026-07");
  });

  it("sin periodo en searchParams usa el resuelto por resolverPeriodo", async () => {
    vi.mocked(resolverVistaGeneral).mockResolvedValue({
      bombero: {} as any,
      secciones: [seccionAdmin] as any,
      jefatura: true,
    });
    await renderPage();
    expect(screen.getByTestId("selector-periodo").textContent).toBe("2026-08");
  });

  /* ---------------- Sección sin KPIs ---------------- */

  it("sección sin KPIs muestra el mensaje correspondiente", async () => {
    vi.mocked(kpisMod.kpisDeSeccion).mockResolvedValueOnce([]);
    vi.mocked(resolverVistaGeneral).mockResolvedValue({
      bombero: {} as any,
      secciones: [seccionAdmin] as any,
      jefatura: true,
    });
    await renderPage();
    expect(screen.getByText(/Sin KPIs definidos en el catálogo/)).toBeTruthy();
  });

  it("sección con KPI sin valor muestra 'Sin dato'", async () => {
    vi.mocked(kpisMod.kpisDeSeccion).mockResolvedValueOnce([
      valorKpi("a", null) as any,
    ]);
    vi.mocked(resolverVistaGeneral).mockResolvedValue({
      bombero: {} as any,
      secciones: [seccionAdmin] as any,
      jefatura: true,
    });
    await renderPage();
    expect(screen.getByText("Sin dato")).toBeTruthy();
  });

  it("sección con KPI numérico muestra el valor y su unidad", async () => {
    vi.mocked(kpisMod.kpisDeSeccion).mockResolvedValueOnce([
      valorKpi("a", "80") as any,
    ]);
    vi.mocked(resolverVistaGeneral).mockResolvedValue({
      bombero: {} as any,
      secciones: [seccionAdmin] as any,
      jefatura: true,
    });
    await renderPage();
    expect(screen.getByText("80")).toBeTruthy();
    expect(screen.getByText("%")).toBeTruthy();
  });
});