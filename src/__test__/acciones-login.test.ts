import { beforeEach, describe, expect, it, vi } from "vitest";

const ACCIONES = "../app/login/actions";

vi.mock("@/lib/auth", () => ({
  acceder: vi.fn(),
  definirClaveDefinitiva: vi.fn(),
}));

describe("solicitarAcceso", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("pide usuario", async () => {
    const { solicitarAcceso } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("paso", "ingresar");
    const r = await solicitarAcceso({} as any, fd);
    expect(r.campo).toBe("usuario");
  });

  it("pide clave", async () => {
    const { solicitarAcceso } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("usuario", "ana");
    const r = await solicitarAcceso({} as any, fd);
    expect(r.campo).toBe("clave");
  });

  it("devuelve nueva-clave si el backend lo pide", async () => {
    const auth = await import("@/lib/auth");
    (auth.acceder as any).mockResolvedValue({ estado: "nueva-clave-requerida" });
    const { solicitarAcceso } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("usuario", "ana");
    fd.set("clave", "abc");
    const r = await solicitarAcceso({} as any, fd);
    expect(r.estado).toBe("nueva-clave");
  });

  it("traduce credenciales incorrectas", async () => {
    const auth = await import("@/lib/auth");
    (auth.acceder as any).mockResolvedValue({ estado: "error", motivo: "mal" });
    const { solicitarAcceso } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("usuario", "ana");
    fd.set("clave", "abc");
    const r = await solicitarAcceso({} as any, fd);
    expect(r.estado).toBe("error");
    expect(r.campo).toBe("clave");
  });

  it("no marca campo si sinConfigurar", async () => {
    const auth = await import("@/lib/auth");
    (auth.acceder as any).mockResolvedValue({
      estado: "error",
      motivo: "sin config",
      sinConfigurar: true,
    });
    const { solicitarAcceso } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("usuario", "ana");
    fd.set("clave", "abc");
    const r = await solicitarAcceso({} as any, fd);
    expect(r.campo).toBeUndefined();
  });

  it("devuelve concedido si ok", async () => {
    const auth = await import("@/lib/auth");
    (auth.acceder as any).mockResolvedValue({
      estado: "ok",
      bombero: { nombre: "Ana", grado: "Teniente CBP" },
    });
    const { solicitarAcceso } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("usuario", "ana");
    fd.set("clave", "abc");
    const r = await solicitarAcceso({} as any, fd);
    expect(r.estado).toBe("concedido");
  });

  describe("paso nueva-clave", () => {
    it("valida longitud mínima", async () => {
      const { solicitarAcceso } = await import(ACCIONES);
      const fd = new FormData();
      fd.set("paso", "nueva-clave");
      fd.set("nueva", "123");
      fd.set("confirmacion", "123");
      const r = await solicitarAcceso({} as any, fd);
      expect(r.campo).toBe("nueva");
    });

    it("valida coincidencia", async () => {
      const { solicitarAcceso } = await import(ACCIONES);
      const fd = new FormData();
      fd.set("paso", "nueva-clave");
      fd.set("nueva", "12345678");
      fd.set("confirmacion", "otra");
      const r = await solicitarAcceso({} as any, fd);
      expect(r.campo).toBe("confirmacion");
    });

    it("recuperable si política", async () => {
      const auth = await import("@/lib/auth");
      (auth.definirClaveDefinitiva as any).mockResolvedValue({
        estado: "error",
        motivo: "no cumple la política",
      });
      const { solicitarAcceso } = await import(ACCIONES);
      const fd = new FormData();
      fd.set("paso", "nueva-clave");
      fd.set("nueva", "12345678");
      fd.set("confirmacion", "12345678");
      const r = await solicitarAcceso({} as any, fd);
      expect(r.estado).toBe("nueva-clave");
    });

    it("no recuperable si sesión vencida", async () => {
      const auth = await import("@/lib/auth");
      (auth.definirClaveDefinitiva as any).mockResolvedValue({
        estado: "error",
        motivo: "sesión vencida",
      });
      const { solicitarAcceso } = await import(ACCIONES);
      const fd = new FormData();
      fd.set("paso", "nueva-clave");
      fd.set("nueva", "12345678");
      fd.set("confirmacion", "12345678");
      const r = await solicitarAcceso({} as any, fd);
      expect(r.estado).toBe("error");
    });
  });
});