// src/__test__/seccion-page.test.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw Object.assign(new Error("NEXT_NOT_FOUND"));
  }),
}));

vi.mock("@/lib/datos-demo", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    REGISTROS_KPI: [
      { kpi: "k1", periodo: "2026-08", valor: 100, registradoPor: "Ana", fecha: "01/09/2026" },
      { kpi: "k1", periodo: "2026-07", valor: 90, registradoPor: "Ana", fecha: "01/08/2026" },
      { kpi: "k2", periodo: "2026-08", valor: 50, registradoPor: "Luis", fecha: "01/09/2026", detalle: "cubierto" },
    ],
  };
});

vi.mock("@/lib/kpis", async () => {
  const real = await vi.importActual<any>("@/lib/kpis");
  return {
    ...real,
    etiquetaPeriodo: vi.fn((p: string) => p),
    kpisDeSeccion: vi.fn(),
    resolverPeriodo: vi.fn((p) => p ?? "2026-08"),
  };
});

vi.mock("@/lib/secciones", () => ({
  seccionPorClave: vi.fn(),
}));

vi.mock("../app/panel/dashboard/acceso", () => ({
  exigirSeccion: vi.fn(),
}));

vi.mock("../app/panel/dashboard/Encabezado", () => ({
  EncabezadoSeccion: ({ seccion, periodo }: any) => (
    <div data-testid="encabezado">{seccion.nombre} · {periodo}</div>
  ),
}));

vi.mock("../app/panel/dashboard/Kpis", () => ({
  Kpis: ({ valores, tono }: any) => (
    <div data-testid="kpis">Kpis ({valores.length}) tono={tono ?? "none"}</div>
  ),
}));

import SeccionRegistro, {
  generateMetadata,
} from "../app/panel/dashboard/[seccion]/page";
import { exigirSeccion } from "@/app/panel/dashboard/acceso";
import { kpisDeSeccion } from "@/lib/kpis";
import { seccionPorClave } from "@/lib/secciones";

const seccionRegistro = {
  clave: "instruccion",
  nombre: "Instrucción",
  ruta: "/panel/dashboard/instruccion",
  tono: "var(--bleu)",
  fuente: "registro" as const,
};

const kpiValor = (clave: string, unidad: string = "%") => ({
  kpi: {
    clave,
    nombre: `Nombre ${clave}`,
    descripcion: "d",
    formula: "f",
    unidad,
    area: "Operatividad",
    seccionOrigen: "x",
    secciones: ["instruccion"],
    fuente: "registro",
  },
  valor: "10",
  detalle: "det",
});

async function renderPage(clave: string, searchParams: Record<string, string> = {}) {
  const jsx = await SeccionRegistro({
    params: Promise.resolve({ seccion: clave }),
    searchParams: Promise.resolve(searchParams),
  });
  return render(jsx as any);
}

describe("dashboard/[seccion]/page.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exigirSeccion).mockResolvedValue({} as any);
    vi.mocked(kpisDeSeccion).mockResolvedValue([]);
    vi.mocked(seccionPorClave).mockReturnValue(seccionRegistro as any);
  });

  /* ---------------- generateMetadata ---------------- */

  describe("generateMetadata", () => {
    it("devuelve el nombre de la sección si es de registro", async () => {
      const meta = await generateMetadata({
        params: Promise.resolve({ seccion: "instruccion" }),
      } as any);
      expect(meta.title).toBe("Instrucción");
    });

    it("devuelve 'Dashboard' si la clave no existe", async () => {
      vi.mocked(seccionPorClave).mockReturnValueOnce(undefined);
      const meta = await generateMetadata({
        params: Promise.resolve({ seccion: "invent" }),
      } as any);
      expect(meta.title).toBe("Dashboard");
    });

    it("devuelve 'Dashboard' si la sección no es de registro", async () => {
      vi.mocked(seccionPorClave).mockReturnValueOnce({
        ...seccionRegistro,
        fuente: "inventario",
      } as any);
      const meta = await generateMetadata({
        params: Promise.resolve({ seccion: "servicio-general" }),
      } as any);
      expect(meta.title).toBe("Dashboard");
    });
  });

  /* ---------------- notFound ---------------- */

  it("notFound si la sección no existe", async () => {
    vi.mocked(seccionPorClave).mockReturnValueOnce(undefined);
    await expect(renderPage("x")).rejects.toThrow(/NEXT_NOT_FOUND/);
  });

  it("notFound si la sección no es de registro", async () => {
    vi.mocked(seccionPorClave).mockReturnValueOnce({
      ...seccionRegistro,
      fuente: "documental",
    } as any);
    await expect(renderPage("administracion")).rejects.toThrow(/NEXT_NOT_FOUND/);
  });

  /* ---------------- exigirSeccion ---------------- */

  it("llama a exigirSeccion con la clave", async () => {
    await renderPage("instruccion");
    expect(exigirSeccion).toHaveBeenCalledWith("instruccion");
  });

  /* ---------------- Render ---------------- */

  it("renderiza el encabezado con la sección y periodo", async () => {
    await renderPage("instruccion", { periodo: "2026-07" });
    expect(screen.getByTestId("encabezado").textContent).toContain("Instrucción");
    expect(screen.getByTestId("encabezado").textContent).toContain("2026-07");
  });

  it("pasa el tono de la sección a Kpis", async () => {
    await renderPage("instruccion");
    expect(screen.getByTestId("kpis").textContent).toContain("tono=var(--bleu)");
  });

  it("sin valores: muestra mensaje de vacío", async () => {
    vi.mocked(kpisDeSeccion).mockResolvedValueOnce([]);
    await renderPage("instruccion");
    expect(screen.getByText(/aún no ha registrado valores/)).toBeTruthy();
  });

  it("con valores: renderiza el historial filtrado por kpi", async () => {
    vi.mocked(kpisDeSeccion).mockResolvedValueOnce([
      kpiValor("k1"),
      kpiValor("k2"),
    ] as any);
    await renderPage("instruccion");

    // k1 tiene 2 registros, k2 tiene 1
    expect(screen.getAllByText("Nombre k1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Nombre k2").length).toBeGreaterThanOrEqual(1);
  });

  it("formatea S/ con prefijo", async () => {
    vi.mocked(kpisDeSeccion).mockResolvedValueOnce([
      kpiValor("k1", "S/"),
    ] as any);
    await renderPage("instruccion");
    expect(screen.getByText(/S\/ 100/)).toBeTruthy();
  });
});