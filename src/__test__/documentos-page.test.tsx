// src/__test__/documentos-page.test.tsx
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

vi.mock("@/app/panel/bandeja-documental/documentos/TablaDocumentos", () => ({
  TablaDocumentos: ({ documentos }: any) => (
    <div data-testid="tabla">{documentos.length}</div>
  ),
}));

vi.mock("@/app/panel/iconos", () => ({
  IconFlecha: () => <span data-testid="icon-flecha" />,
}));

// Permisos y secciones reales: el bug está justo en su combinación.

import Bandeja from "../app/panel/bandeja-documental/documentos/page";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/sesion";
import { listarDocumentos } from "@/lib/documentos-repo";

const bombero = (grupos: string[]) =>
  ({
    codigo: "u1",
    nombre: "Ana",
    grado: "",
    cargo: "",
    seccion: "",
    iniciales: "A",
    grupos,
    rol: null,
  }) as any;

const doc = (id: string, seccion: string) =>
  ({ id, numero: `N° ${id}`, seccion, estado: "Pendiente" }) as any;

const abrir = (params: Record<string, string> = {}) =>
  Bandeja({ searchParams: Promise.resolve(params) });

describe("bandeja-documental/documentos/page.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listarDocumentos).mockResolvedValue([
      doc("1", "sanidad"),
      doc("2", "maquinas"),
      doc("3", "administracion"),
    ]);
  });

  it("redirige a login si no hay sesión", async () => {
    vi.mocked(obtenerSesion).mockResolvedValueOnce(null);
    await expect(abrir()).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  /* ---------------- Caso de Prueba 011 ---------------- */

  it("expulsa al Jefe de Sección que fuerza por URL la sección de otra área", async () => {
    vi.mocked(obtenerSesion).mockResolvedValue(bombero(["Jefe_Sanidad"]));
    await expect(abrir({ seccion: "maquinas" })).rejects.toThrow(/NEXT_REDIRECT/);
    expect(redirect).toHaveBeenCalledWith("/panel/bandeja-documental/documentos");
  });

  it("deja al Jefe de Sección filtrar por su propia sección", async () => {
    vi.mocked(obtenerSesion).mockResolvedValue(bombero(["Jefe_Sanidad"]));
    render((await abrir({ seccion: "sanidad" })) as any);
    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Documentos · Sanidad" })).toBeTruthy();
    expect(screen.getByTestId("tabla").textContent).toBe("1");
  });

  it("Jefatura puede filtrar por cualquier sección", async () => {
    vi.mocked(obtenerSesion).mockResolvedValue(bombero(["Jefatura"]));
    render((await abrir({ seccion: "maquinas" })) as any);
    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Documentos · Máquinas" })).toBeTruthy();
  });

  it("Administración puede filtrar por cualquier sección", async () => {
    vi.mocked(obtenerSesion).mockResolvedValue(bombero(["Jefe_Administracion"]));
    render((await abrir({ seccion: "sanidad" })) as any);
    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByTestId("tabla").textContent).toBe("1");
  });

  it("una sección inexistente se ignora y muestra la bandeja propia", async () => {
    vi.mocked(obtenerSesion).mockResolvedValue(bombero(["Jefe_Sanidad"]));
    render((await abrir({ seccion: "no-existe" })) as any);
    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Documentos" })).toBeTruthy();
    expect(screen.getByTestId("tabla").textContent).toBe("1");
  });
});
