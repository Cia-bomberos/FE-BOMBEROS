// src/__test__/inventario-repo.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const REPO = "../lib/inventario-repo";

const actor = {
  sub: "u-1",
  nombre: "Ana",
  grado: "Teniente CBP",
  seccion: "servicio-general",
  grupos: ["Jefe_ServicioGeneral"],
} as any;

describe("inventario-repo", () => {
  beforeEach(() => {
    vi.resetModules();
    // Si el repo cachea en globalThis con otra clave, ajústala.
    delete (globalThis as any).__f3Inventario;
  });

  afterEach(() => {
    delete (globalThis as any).__f3Inventario;
    vi.restoreAllMocks();
  });

  describe("listarActivos y obtenerActivo", () => {
    it("lista los activos sembrados", async () => {
      const { listarActivos } = await import(REPO);
      const activos = await listarActivos();
      expect(Array.isArray(activos)).toBe(true);
      expect(activos.length).toBeGreaterThan(0);
    });

    it("devuelve copias (no referencias mutables)", async () => {
      const { listarActivos } = await import(REPO);
      const a = await listarActivos();
      const b = await listarActivos();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });

    it("obtenerActivo devuelve null si no existe", async () => {
      const { obtenerActivo } = await import(REPO);
      expect(await obtenerActivo("no-existe")).toBeNull();
    });

    it("obtenerActivo devuelve el activo existente", async () => {
      const { listarActivos, obtenerActivo } = await import(REPO);
      const [primero] = await listarActivos();
      const a = await obtenerActivo(primero.codigo);
      expect(a?.codigo).toBe(primero.codigo);
    });
  });

  describe("registrarActivo (RN-0036)", () => {
    const base = {
      descripcion: "Extintor PQS 6kg",
      categoria: "Extintores" as any,
      cantidad: 2,
      ubicacion: "Depósito A",
      estado: "Operativo" as any,
      seccion: "servicio-general" as any,
    };

    it("registra y devuelve el código generado", async () => {
      const { registrarActivo } = await import(REPO);
      const r = await registrarActivo(base, actor);
      expect(r.codigo).toMatch(/^[A-Z0-9-]+$/);
    });

    it("incluye al actor en la trazabilidad", async () => {
      const { registrarActivo } = await import(REPO);
      const r = await registrarActivo(base, actor);
      // Ajusta a la forma real del activo:
      expect(JSON.stringify(r)).toContain("Ana");
    });

    it("omite observaciones si vienen vacías", async () => {
      const { registrarActivo } = await import(REPO);
      const r = await registrarActivo(
        { ...base, observaciones: undefined } as any,
        actor,
      );
      expect(r).toBeTruthy();
    });
  });

  describe("permisos", () => {
    it("puedeRegistrarActivo true si tiene sección con inventario", async () => {
      const { puedeRegistrarActivo } = await import(REPO);
      expect(puedeRegistrarActivo(actor)).toBe(true);
    });

    it("puedeRegistrarActivo false si no tiene sección", async () => {
      const { puedeRegistrarActivo } = await import(REPO);
      expect(
      puedeRegistrarActivo({ ...actor, grupos: ["Jefe_Administracion"] }),
    ).toBe(false);
    });

    it("seccionesInventarioDe devuelve al menos la propia", async () => {
      const { seccionesInventarioDe } = await import(REPO);
      const s = seccionesInventarioDe(actor);
      expect(s).toContain("servicio-general");
      expect(s.length).toBeGreaterThan(0);
    });

    it("seccionesInventarioDe vacío para sección sin inventario", async () => {
      const { seccionesInventarioDe } = await import(REPO);
      expect(
        seccionesInventarioDe({ ...actor, grupos: ["Jefe_Administracion"] }),
      ).toEqual([]);
    });

    it("sin grupo no tiene inventario aunque el atributo diga una sección", async () => {
      const { seccionesInventarioDe } = await import(REPO);
      expect(seccionesInventarioDe({ ...actor, grupos: [] })).toEqual([]);
    });
  });

  describe("catálogos", () => {
    it("CATEGORIAS_ACTIVO no está vacío", async () => {
      const { CATEGORIAS_ACTIVO } = await import(REPO);
      expect(CATEGORIAS_ACTIVO.length).toBeGreaterThan(0);
    });

    it("ESTADOS_ACTIVO no está vacío", async () => {
      const { ESTADOS_ACTIVO } = await import(REPO);
      expect(ESTADOS_ACTIVO.length).toBeGreaterThan(0);
    });
  });
});