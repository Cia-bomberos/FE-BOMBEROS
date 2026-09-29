// src/__test__/inventario-page.test.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("@/lib/sesion", () => ({
  obtenerSesion: vi.fn(),
}));

vi.mock("@/lib/inventario-repo", () => ({
  activosVisibles: vi.fn((_, x) => x),
  listarActivos: vi.fn(),
  puedeRegistrarActivo: vi.fn(),
  SECCIONES_INVENTARIO: [
    { clave: "servicio-general", nombre: "Servicio General" },
    { clave: "sanidad", nombre: "Sanidad" },
  ],
  seccionesInventarioDe: vi.fn(),
}));

vi.mock("@/app/panel/inventario/TablaInventario", () => ({
  TablaInventario: ({ activos, secciones }: any) => (
    <div data-testid="tabla">
      Tabla ({activos.length}) secciones={secciones.map((s: any) => s.clave).join(",")}
    </div>
  ),
}));

vi.mock("@/app/panel/iconos", () => ({
  IconFlecha: () => <span data-testid="icon-flecha" />,
}));

import Inventario from "../app/panel/inventario/page";
import { obtenerSesion } from "@/lib/sesion";
import {
  listarActivos,
  puedeRegistrarActivo,
  seccionesInventarioDe,
} from "@/lib/inventario-repo";

const bombero = { sub: "u1", nombre: "Ana" } as any;

async function renderPage(searchParams: Record<string, string> = {}) {
  const jsx = await Inventario({ searchParams: Promise.resolve(searchParams) });
  return render(jsx as any);
}

describe("inventario/page.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(obtenerSesion).mockResolvedValue(bombero);
    vi.mocked(listarActivos).mockResolvedValue([]);
    vi.mocked(puedeRegistrarActivo).mockReturnValue(true);
    vi.mocked(seccionesInventarioDe).mockReturnValue(["servicio-general"]);
  });

  /* ---------------- Redirect ---------------- */

  it("redirige a login si no hay sesión", async () => {
    vi.mocked(obtenerSesion).mockResolvedValueOnce(null);
    await expect(renderPage()).rejects.toThrow(/NEXT_REDIRECT/);
  });

  /* ---------------- Encabezado ---------------- */

  it("renderiza el título", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { name: "Inventario" })).toBeTruthy();
  });

  it("subtítulo con el conteo de activos", async () => {
    vi.mocked(listarActivos).mockResolvedValueOnce([{}, {}, {}] as any);
    await renderPage();
    expect(screen.getByText(/3 activos y recursos/)).toBeTruthy();
  });

  it("con una sola sección añade ' en X' al subtítulo", async () => {
    await renderPage();
    expect(screen.getByText(/en Servicio General/)).toBeTruthy();
  });

  it("con múltiples secciones omite el ' en X'", async () => {
    vi.mocked(seccionesInventarioDe).mockReturnValue(["servicio-general", "sanidad"]);
    await renderPage();
    const subtitulo = screen.getByText(/activos y recursos/);
    expect(subtitulo.textContent).not.toMatch(/ en /);
  });

  /* ---------------- Botón registrar ---------------- */

  it("muestra 'Registrar activo' si puedeRegistrarActivo", async () => {
    await renderPage();
    const link = screen.getByRole("link", { name: /Registrar activo/ });
    expect(link.getAttribute("href")).toBe("/panel/inventario/registrar");
  });

  it("oculta el botón si no puedeRegistrarActivo", async () => {
    vi.mocked(puedeRegistrarActivo).mockReturnValueOnce(false);
    await renderPage();
    expect(screen.queryByRole("link", { name: /Registrar activo/ })).toBeNull();
  });

  /* ---------------- Mensaje de registrado ---------------- */

  it("muestra mensaje si viene ?registrado=", async () => {
    await renderPage({ registrado: "SG-011" });
    expect(screen.getByText(/Activo registrado con el identificador SG-011/)).toBeTruthy();
  });

  it("sin ?registrado no muestra mensaje de éxito", async () => {
    await renderPage();
    expect(screen.queryByText(/Activo registrado/)).toBeNull();
  });

  /* ---------------- Secciones ---------------- */

  it("sin secciones muestra mensaje de vacío", async () => {
    vi.mocked(seccionesInventarioDe).mockReturnValueOnce([]);
    await renderPage();
    expect(screen.getByText(/no tiene una sección con inventario/)).toBeTruthy();
    expect(screen.queryByTestId("tabla")).toBeNull();
  });

  it("con secciones renderiza la tabla", async () => {
    await renderPage();
    expect(screen.getByTestId("tabla")).toBeTruthy();
  });

  it("la tabla recibe solo las secciones visibles", async () => {
    vi.mocked(seccionesInventarioDe).mockReturnValue(["sanidad"]);
    await renderPage();
    expect(screen.getByTestId("tabla").textContent).toContain("secciones=sanidad");
  });
});