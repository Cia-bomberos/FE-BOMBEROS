// src/__test__/inventario-registrar-page.test.tsx
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
  puedeRegistrarActivo: vi.fn(),
  SECCIONES_INVENTARIO: [
    { clave: "servicio-general", nombre: "Servicio General" },
    { clave: "sanidad", nombre: "Sanidad" },
  ],
  seccionesInventarioDe: vi.fn(),
}));

vi.mock("@/app/panel/inventario/registrar/FormularioActivo", () => ({
  FormularioActivo: ({ secciones }: any) => (
    <div data-testid="formulario">Formulario ({secciones.length})</div>
  ),
}));

import RegistrarActivo from "../app/panel/inventario/registrar/page";
import { obtenerSesion } from "@/lib/sesion";
import {
  puedeRegistrarActivo,
  seccionesInventarioDe,
} from "@/lib/inventario-repo";

const bombero = { sub: "u1" } as any;

async function renderPage() {
  const jsx = await RegistrarActivo();
  return render(jsx as any);
}

describe("inventario/registrar/page.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(obtenerSesion).mockResolvedValue(bombero);
    vi.mocked(puedeRegistrarActivo).mockReturnValue(true);
    vi.mocked(seccionesInventarioDe).mockReturnValue(["servicio-general"]);
  });

  it("redirige a login si no hay sesión", async () => {
    vi.mocked(obtenerSesion).mockResolvedValueOnce(null);
    await expect(renderPage()).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("muestra mensaje si no puede registrar activos", async () => {
    vi.mocked(puedeRegistrarActivo).mockReturnValueOnce(false);
    await renderPage();
    expect(screen.getByText(/no puede registrar activos/)).toBeTruthy();
    expect(screen.queryByTestId("formulario")).toBeNull();
  });

  it("renderiza las migas", async () => {
    await renderPage();
    const link = screen.getByRole("link", { name: "Inventario" });
    expect(link.getAttribute("href")).toBe("/panel/inventario");
  });

  it("renderiza el título", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { name: /Registrar activo o recurso/ })).toBeTruthy();
  });

  it("renderiza el formulario con las secciones visibles", async () => {
    await renderPage();
    expect(screen.getByTestId("formulario").textContent).toContain("Formulario (1)");
  });

  it("filtra las secciones por las claves del usuario", async () => {
    vi.mocked(seccionesInventarioDe).mockReturnValue(["sanidad"]);
    await renderPage();
    expect(screen.getByTestId("formulario").textContent).toContain("Formulario (1)");
  });

  it("sin secciones visibles pasa array vacío", async () => {
    vi.mocked(seccionesInventarioDe).mockReturnValueOnce([]);
    await renderPage();
    expect(screen.getByTestId("formulario").textContent).toContain("Formulario (0)");
  });
});