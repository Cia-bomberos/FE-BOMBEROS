// src/__test__/bandeja-page.test.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));

vi.mock("@/lib/sesion", () => ({
  obtenerSesion: vi.fn(),
}));

vi.mock("@/lib/documentos-repo", () => ({
  listarDocumentos: vi.fn(),
}));

vi.mock("@/lib/permisos-documentos", () => ({
  documentosVisibles: vi.fn((_, docs) => docs),
  puedeRegistrar: vi.fn(),
}));

vi.mock("@/app/panel/bandeja-documental/Grafico", () => ({
  Grafico: ({ serie }: any) => (
    <div data-testid="grafico">{serie.map((p: any) => p.valor).join(",")}</div>
  ),
}));

vi.mock("@/app/panel/bandeja-documental/Etiquetas", () => ({
  EtiquetaEstado: ({ estado }: any) => <span>{estado}</span>,
  EtiquetaPrioridad: ({ prioridad }: any) => <span>{prioridad}</span>,
}));

vi.mock("@/app/panel/iconos", () => ({
  IconFlecha: () => <span data-testid="icon-flecha" />,
}));

import MesaDePartes from "../app/panel/bandeja-documental/page";
import { obtenerSesion } from "@/lib/sesion";
import { listarDocumentos } from "@/lib/documentos-repo";
import { puedeRegistrar } from "@/lib/permisos-documentos";

const bombero = { sub: "u1", nombre: "Ana", seccion: "administracion" } as any;

const doc = (id: string) =>
  ({
    id,
    numero: `N° ${id}`,
    asunto: `Asunto ${id}`,
    origen: "Comandancia",
    destino: "Administración",
    seccion: "administracion",
    via: "Digital",
    folios: 1,
    fechaIngreso: "01/01/2026",
    plazo: "15/01/2026",
    estado: "Pendiente",
    prioridad: "Alta",
    prioridadManual: false,
    trazabilidad: [],
  }) as any;

describe("bandeja-documental/page.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(obtenerSesion).mockResolvedValue(bombero);
    vi.mocked(listarDocumentos).mockResolvedValue([]);
    vi.mocked(puedeRegistrar).mockReturnValue(false);
  });

  it("redirige a login si no hay sesión", async () => {
    vi.mocked(obtenerSesion).mockResolvedValueOnce(null);
    await expect(MesaDePartes()).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("renderiza el título de la bandeja", async () => {
    render((await MesaDePartes()) as any);
    expect(screen.getByRole("heading", { name: "Bandeja Documental" })).toBeTruthy();
  });

  /* ---------------- Botón de registrar ---------------- */

  it("muestra 'Registrar ingreso' si puedeRegistrar", async () => {
    vi.mocked(puedeRegistrar).mockReturnValue(true);
    render((await MesaDePartes()) as any);
    const link = screen.getByRole("link", { name: /Registrar ingreso/ });
    expect(link.getAttribute("href")).toBe("/panel/bandeja-documental/registrar");
  });

  it("oculta 'Registrar ingreso' si no puedeRegistrar", async () => {
    vi.mocked(puedeRegistrar).mockReturnValue(false);
    render((await MesaDePartes()) as any);
    expect(screen.queryByRole("link", { name: /Registrar ingreso/ })).toBeNull();
  });

  /* ---------------- Documentos recientes ---------------- */

  it("sin documentos no hay filas", async () => {
    vi.mocked(listarDocumentos).mockResolvedValueOnce([]);
    render((await MesaDePartes()) as any);
    expect(screen.queryAllByText(/N° /)).toHaveLength(0);
  });

  it("muestra hasta 5 documentos recientes", async () => {
    vi.mocked(listarDocumentos).mockResolvedValueOnce(
      [1, 2, 3, 4, 5, 6, 7].map((n) => doc(String(n))),
    );
    render((await MesaDePartes()) as any);
    // Solo los 5 primeros
    for (const n of [1, 2, 3, 4, 5]) {
      expect(screen.getByText(`N° ${n}`)).toBeTruthy();
    }
    expect(screen.queryByText("N° 6")).toBeNull();
    expect(screen.queryByText("N° 7")).toBeNull();
  });

  it("cada documento enlaza con su detalle", async () => {
    vi.mocked(listarDocumentos).mockResolvedValueOnce([doc("abc")]);
    render((await MesaDePartes()) as any);
    const link = screen.getByText("N° abc").closest("a");
    expect(link?.getAttribute("href")).toBe(
      "/panel/bandeja-documental/documentos/abc",
    );
  });

  /* ---------------- Métricas reales ---------------- */

  it("calcula los KPIs con los documentos visibles", async () => {
    vi.mocked(listarDocumentos).mockResolvedValueOnce([
      { ...doc("1"), estado: "Pendiente", plazo: "01/01/2020" },
      { ...doc("2"), estado: "En proceso", plazo: "01/01/2999" },
      { ...doc("3"), estado: "Atendido" },
      { ...doc("4"), estado: "Archivado" },
    ]);
    render((await MesaDePartes()) as any);

    const kpi = (etiqueta: string) => screen.getByText(etiqueta).closest("article")!.textContent;
    expect(kpi("Por atender")).toContain("2");
    expect(kpi("Por atender")).toContain("1 con plazo vencido");
    expect(kpi("Atendidos")).toContain("De 4 documentos");
  });

  it("pasa al gráfico una serie de 6 meses", async () => {
    render((await MesaDePartes()) as any);
    expect(screen.getByTestId("grafico").textContent).toBe("0,0,0,0,0,0");
  });

  it("reparte los documentos por tipo", async () => {
    vi.mocked(listarDocumentos).mockResolvedValueOnce([
      { ...doc("1"), tipo: "Oficio" },
      { ...doc("2"), tipo: "Oficio" },
      { ...doc("3"), tipo: "Informe" },
      { ...doc("4"), tipo: "Externo" },
    ]);
    render((await MesaDePartes()) as any);
    expect(screen.getByText("Sobre 4 ingresos")).toBeTruthy();
    expect(screen.getByText("Oficio").parentElement!.textContent).toContain("50%");
    expect(screen.getByText("Informe").parentElement!.textContent).toContain("25%");
  });

  it("sin documentos, la distribución lo indica", async () => {
    render((await MesaDePartes()) as any);
    expect(screen.getByText("Aún no hay documentos registrados.")).toBeTruthy();
  });

  it("renderiza el botón 'Ver bandeja completa'", async () => {
    render((await MesaDePartes()) as any);
    const link = screen.getByRole("link", { name: /Ver bandeja completa/ });
    expect(link.getAttribute("href")).toBe("/panel/bandeja-documental/documentos");
  });
});