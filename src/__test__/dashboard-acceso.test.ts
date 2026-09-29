// src/__test__/dashboard-acceso.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));
vi.mock("../lib/sesion", () => ({ obtenerSesion: vi.fn() }));
vi.mock("../lib/secciones", () => ({
  esJefatura: vi.fn(),
  puedeVer: vi.fn(),
  seccionesVisibles: vi.fn(),
}));

const ACCESO = "../app/panel/dashboard/acceso";

const bombero = { sub: "u1", seccion: "administracion" } as any;

describe("dashboard/acceso", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("exigirSeccion", () => {
    it("redirige a login si no hay sesión", async () => {
      const sesion = await import("../lib/sesion");
      (sesion.obtenerSesion as any).mockResolvedValue(null);
      const { exigirSeccion } = await import(ACCESO);
      await expect(exigirSeccion("maquinas")).rejects.toThrow(/NEXT_REDIRECT/);
    });

    it("redirige al dashboard si no puede ver", async () => {
      const sesion = await import("../lib/sesion");
      const secciones = await import("../lib/secciones");
      (sesion.obtenerSesion as any).mockResolvedValue(bombero);
      (secciones.puedeVer as any).mockReturnValue(false);

      const { exigirSeccion } = await import(ACCESO);
      await expect(exigirSeccion("maquinas")).rejects.toThrow(/NEXT_REDIRECT/);
    });

    it("devuelve el bombero si puede ver", async () => {
      const sesion = await import("../lib/sesion");
      const secciones = await import("../lib/secciones");
      (sesion.obtenerSesion as any).mockResolvedValue(bombero);
      (secciones.puedeVer as any).mockReturnValue(true);

      const { exigirSeccion } = await import(ACCESO);
      const r = await exigirSeccion("administracion");
      expect(r).toBe(bombero);
    });
  });

  describe("resolverVistaGeneral", () => {
    it("redirige a login si no hay sesión", async () => {
      const sesion = await import("../lib/sesion");
      (sesion.obtenerSesion as any).mockResolvedValue(null);
      const { resolverVistaGeneral } = await import(ACCESO);
      await expect(resolverVistaGeneral()).rejects.toThrow(/NEXT_REDIRECT/);
    });

    it("Jefatura: ve la general completa", async () => {
      const sesion = await import("../lib/sesion");
      const secciones = await import("../lib/secciones");
      (sesion.obtenerSesion as any).mockResolvedValue(bombero);
      (secciones.esJefatura as any).mockReturnValue(true);
      (secciones.seccionesVisibles as any).mockReturnValue([
        { ruta: "/panel/dashboard/administracion" },
        { ruta: "/panel/dashboard/maquinas" },
      ]);

      const { resolverVistaGeneral } = await import(ACCESO);
      const r = await resolverVistaGeneral();
      expect(r.jefatura).toBe(true);
      expect(r.secciones).toHaveLength(2);
    });

    it("Jefe de una sola sección: redirige a esa sección", async () => {
      const sesion = await import("../lib/sesion");
      const secciones = await import("../lib/secciones");
      (sesion.obtenerSesion as any).mockResolvedValue(bombero);
      (secciones.esJefatura as any).mockReturnValue(false);
      (secciones.seccionesVisibles as any).mockReturnValue([
        { ruta: "/panel/dashboard/administracion" },
      ]);

      const { resolverVistaGeneral } = await import(ACCESO);
      await expect(resolverVistaGeneral()).rejects.toThrow(/NEXT_REDIRECT/);
    });

    it("Jefe con varias secciones: ve la general filtrada", async () => {
      const sesion = await import("../lib/sesion");
      const secciones = await import("../lib/secciones");
      (sesion.obtenerSesion as any).mockResolvedValue(bombero);
      (secciones.esJefatura as any).mockReturnValue(false);
      (secciones.seccionesVisibles as any).mockReturnValue([
        { ruta: "/a" },
        { ruta: "/b" },
      ]);

      const { resolverVistaGeneral } = await import(ACCESO);
      const r = await resolverVistaGeneral();
      expect(r.jefatura).toBe(false);
      expect(r.secciones).toHaveLength(2);
    });
  });
});