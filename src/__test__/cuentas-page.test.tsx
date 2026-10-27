// src/__test__/cuentas-page.test.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("REDIRECT"), { url });
  }),
}));

vi.mock("../lib/sesion", () => ({ obtenerSesion: vi.fn() }));
vi.mock("../lib/secciones", () => ({ esJefatura: vi.fn() }));
vi.mock("../lib/cuentas-api", () => ({
  listarCuentas: vi.fn(),
  cuentasDelCatalogo: vi.fn(() => [{ username: "local", nombre: "Local" }]),
}));
vi.mock("../app/panel/cuentas/FormularioPassword", () => ({
  FormularioCuenta: ({ cuenta }: any) => (
    <div data-testid="cuenta">{cuenta.username}</div>
  ),
}));

import Page from "../app/panel/cuentas/page";
import { obtenerSesion } from "../lib/sesion";
import { esJefatura } from "../lib/secciones";
import { listarCuentas } from "../lib/cuentas-api";

describe("cuentas/page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirige a login si no hay sesión", async () => {
    (obtenerSesion as any).mockResolvedValue(null);
    await expect(Page()).rejects.toThrow(/REDIRECT/);
  });

  it("redirige si no es jefatura", async () => {
    (obtenerSesion as any).mockResolvedValue({ sub: "u1" });
    (esJefatura as any).mockReturnValue(false);
    await expect(Page()).rejects.toThrow(/REDIRECT/);
  });

  it("renderiza las cuentas del backend", async () => {
    (obtenerSesion as any).mockResolvedValue({ sub: "u1" });
    (esJefatura as any).mockReturnValue(true);
    (listarCuentas as any).mockResolvedValue({
      ok: true,
      datos: [{ username: "admin", nombre: "Admin" }],
    });

    const jsx = await Page();
    render(jsx as any);
    expect(screen.getByTestId("cuenta").textContent).toBe("admin");
  });

  it("muestra error y catálogo local si falla el backend", async () => {
    (obtenerSesion as any).mockResolvedValue({ sub: "u1" });
    (esJefatura as any).mockReturnValue(true);
    (listarCuentas as any).mockResolvedValue({
      ok: false,
      motivo: "boom",
      sinConfigurar: false,
    });

    const jsx = await Page();
    render(jsx as any);
    expect(screen.getByRole("alert").textContent).toContain("No se pudo consultar");
    expect(screen.getByTestId("cuenta").textContent).toBe("local");
  });
});