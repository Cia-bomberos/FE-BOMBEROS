// src/__test__/configuracion-drive-page.test.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("REDIRECT"), { url });
  }),
}));

vi.mock("../lib/sesion", () => ({ obtenerSesion: vi.fn() }));
vi.mock("../lib/configuracion-drive", () => ({
  obtenerConfiguracionDrive: vi.fn(),
}));
vi.mock("../app/panel/configuracion/drive/FormularioDrive", () => ({
  FormularioDrive: ({ configInicial }: any) => (
    <div data-testid="form">{configInicial.enlace}</div>
  ),
}));

import Page from "../app/panel/configuracion/drive/page";
import { obtenerSesion } from "../lib/sesion";
import { obtenerConfiguracionDrive } from "../lib/configuracion-drive";

describe("configuracion/drive/page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirige a login si no hay sesión", async () => {
    (obtenerSesion as any).mockResolvedValue(null);
    await expect(Page()).rejects.toThrow(/REDIRECT/);
  });

  it("renderiza el formulario con el enlace actual", async () => {
    (obtenerSesion as any).mockResolvedValue({ sub: "u1" });
    (obtenerConfiguracionDrive as any).mockResolvedValue({ 
      enlace: "https://drive.google.com/...",
      carpeta_nombre: "Carpeta",
      cuenta_respaldo: "respaldo@bomberos.com"
    });

    const jsx = await Page();
    render(jsx as any);
    expect(screen.getByTestId("form").textContent).toBe("https://drive.google.com/...");
  });

  it("muestra error si falla la carga", async () => {
    (obtenerSesion as any).mockResolvedValue({ sub: "u1" });
    (obtenerConfiguracionDrive as any).mockRejectedValue(new Error("Fallo"));

    const jsx = await Page();
    render(jsx as any);
    expect(screen.getByText(/No se pudo cargar/)).toBeTruthy();
    expect(screen.queryByTestId("form")).toBeNull();
  });
});