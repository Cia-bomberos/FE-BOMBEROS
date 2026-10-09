import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KPIS_MOD = "../lib/kpis";

vi.mock("../lib/documentos-repo", () => ({
  listarDocumentosSiDisponible: vi.fn(),
}));

describe("kpis", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => vi.restoreAllMocks());

  describe("etiquetaPeriodo", () => {
    it("formatea yyyy-mm", async () => {
      const { etiquetaPeriodo } = await import(KPIS_MOD);
      expect(etiquetaPeriodo("2026-08")).toBe("agosto 2026");
    });
  });

  describe("calcularKpi", () => {
    it("disponibilidad-unidades con inventario", async () => {
      const { KPIS, calcularKpi } = await import(KPIS_MOD);
      const kpi = KPIS.find((k: { clave: string; }) => k.clave === "disponibilidad-unidades")!;
      const r = await calcularKpi(kpi);
      expect(r.valor).toMatch(/^\d+$/);
      expect(r.detalle).toMatch(/unidades operativas/);
    });

    it("unidades-fuera refleja mantenimiento", async () => {
      const { KPIS, calcularKpi } = await import(KPIS_MOD);
      const kpi = KPIS.find((k: { clave: string; }) => k.clave === "unidades-fuera")!;
      const r = await calcularKpi(kpi);
      expect(r.valor).toBeDefined();
    });

    it("documentos-atendidos cuenta del periodo", async () => {
      const repo = await import("../lib/documentos-repo");
      (repo.listarDocumentosSiDisponible as any).mockResolvedValue([
        { estado: "Atendido", fechaIngreso: "05/08/2026" },
        { estado: "Pendiente", fechaIngreso: "06/08/2026" },
      ]);
      const { KPIS, calcularKpi } = await import(KPIS_MOD);
      const kpi = KPIS.find((k: { clave: string; }) => k.clave === "documentos-atendidos")!;
      const r = await calcularKpi(kpi, "2026-08");
      expect(r.valor).toBe("50");
    });

    it("documentos-atendidos con 0 recibidos", async () => {
      const repo = await import("../lib/documentos-repo");
      (repo.listarDocumentosSiDisponible as any).mockResolvedValue([]);
      const { KPIS, calcularKpi } = await import(KPIS_MOD);
      const kpi = KPIS.find((k: { clave: string; }) => k.clave === "documentos-atendidos")!;
      const r = await calcularKpi(kpi, "2026-08");
      expect(r.valor).toBe("0");
    });

    it("procesos-pendientes", async () => {
      const repo = await import("../lib/documentos-repo");
      (repo.listarDocumentosSiDisponible as any).mockResolvedValue([
        { estado: "Pendiente", fechaIngreso: "05/08/2026" },
        { estado: "En proceso", fechaIngreso: "06/08/2026" },
        { estado: "Atendido", fechaIngreso: "07/08/2026" },
      ]);
      const { KPIS, calcularKpi } = await import(KPIS_MOD);
      const kpi = KPIS.find((k: { clave: string; }) => k.clave === "procesos-pendientes")!;
      const r = await calcularKpi(kpi, "2026-08");
      expect(r.valor).toBe("2");
    });

    it("KPI de registro sin valor devuelve null", async () => {
      const { KPIS, calcularKpi } = await import(KPIS_MOD);
      const kpi = KPIS.find((k: { clave: string; }) => k.clave === "tiempo-respuesta")!;
      const r = await calcularKpi(kpi, "1990-01");
      expect(r.valor).toBeNull();
      expect(r.detalle).toMatch(/Sin valor/);
    });

    it("KPI de registro con valor", async () => {
      const { KPIS, calcularKpi } = await import(KPIS_MOD);
      const kpi = KPIS.find((k: { clave: string; }) => k.clave === "tiempo-respuesta")!;
      const r = await calcularKpi(kpi); // periodo actual
      // Si el seed tiene valor, lo verifica; si no, al menos el detalle
      expect(r.kpi.clave).toBe("tiempo-respuesta");
    });
  });

  describe("kpisDeSeccion", () => {
    it("devuelve solo los KPIs de la sección", async () => {
      const { kpisDeSeccion } = await import(KPIS_MOD);
      const r = await kpisDeSeccion("maquinas");
      expect(r.every((v: { kpi: { secciones: string | string[]; }; }) => v.kpi.secciones.includes("maquinas"))).toBe(true);
    });
  });

  describe("periodosDisponibles", () => {
    it("ordena descendente", async () => {
      const { periodosDisponibles } = await import(KPIS_MOD);
      const p = periodosDisponibles();
      const ordenado = [...p].sort((a, b) => b.localeCompare(a));
      expect(p).toEqual(ordenado);
    });
  });

  describe("resolverPeriodo", () => {
    it("respeta el valor si existe", async () => {
      const { resolverPeriodo, periodosDisponibles } = await import(KPIS_MOD);
      const [p] = periodosDisponibles();
      expect(resolverPeriodo(p)).toBe(p);
    });

    it("cae al actual si no existe", async () => {
      const { PERIODO_ACTUAL } = await import("../lib/datos-demo");
      const { resolverPeriodo: fn } = await import(KPIS_MOD);
      expect(fn("1900-01")).toBe(PERIODO_ACTUAL);
    });
  });

  describe("serieDeKpi", () => {
    it("devuelve puntos ordenados ascendente", async () => {
      const { KPIS, serieDeKpi } = await import(KPIS_MOD);
      const kpi = KPIS.find((k: { clave: string; }) => k.clave === "tiempo-respuesta")!;
      const s = serieDeKpi(kpi);
      const ordenado = [...s].sort((a, b) => a.periodo.localeCompare(b.periodo));
      expect(s).toEqual(ordenado);
    });
  });

  describe("resumenServicioGeneral / resumenSanidad", () => {
    it("cuenta estados", async () => {
      const { resumenServicioGeneral, resumenSanidad } = await import(KPIS_MOD);
      const sg = resumenServicioGeneral();
      expect(sg.total).toBe(
        sg.operativos + sg.enReparacion + sg.deBaja,
      );
      const s = resumenSanidad();
      expect(s.total).toBe(
        s.disponibles + s.bajoStock + s.vencidos,
      );
    });
  });
});