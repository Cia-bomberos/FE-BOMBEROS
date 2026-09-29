// src/__test__/auth.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/cognito", () => ({
  iniciarSesion: vi.fn(),
  establecerNuevaClave: vi.fn(),
}));

vi.mock("../lib/jwt", () => ({
  verificarToken: vi.fn(),
}));

vi.mock("../lib/sesion", () => ({
  crearSesion: vi.fn(),
  guardarReto: vi.fn(),
  obtenerReto: vi.fn(),
  descartarReto: vi.fn(),
}));

vi.mock("../lib/tipos", async () => {
  const real = await vi.importActual<any>("../lib/tipos");
  return real;
});

const AUTH = "../lib/auth";

describe("auth", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => vi.restoreAllMocks());

  describe("acceder", () => {
    it("guarda el reto si Cognito pide nueva clave", async () => {
      const cognito = await import("../lib/cognito");
      const sesion = await import("../lib/sesion");
      (cognito.iniciarSesion as any).mockResolvedValue({
        estado: "reto-nueva-clave",
        usuario: "ana",
        sesion: "sess-1",
      });

      const { acceder } = await import(AUTH);
      const r = await acceder("ana", "temp", false);

      expect(r.estado).toBe("nueva-clave-requerida");
      expect(sesion.guardarReto).toHaveBeenCalledWith({
        usuario: "ana",
        sesion: "sess-1",
      });
    });

    it("usa el usuario del argumento si Cognito no lo devuelve", async () => {
      const cognito = await import("../lib/cognito");
      const sesion = await import("../lib/sesion");
      (cognito.iniciarSesion as any).mockResolvedValue({
        estado: "reto-nueva-clave",
        usuario: "",
        sesion: "sess-1",
      });

      const { acceder } = await import(AUTH);
      await acceder("ana", "temp", false);

      expect(sesion.guardarReto).toHaveBeenCalledWith({
        usuario: "ana",
        sesion: "sess-1",
      });
    });

    it("propaga error de Cognito", async () => {
      const cognito = await import("../lib/cognito");
      (cognito.iniciarSesion as any).mockResolvedValue({
        estado: "error",
        motivo: "Credenciales incorrectas.",
      });
      const { acceder } = await import(AUTH);
      const r = await acceder("ana", "x", false);
      expect(r).toEqual({ estado: "error", motivo: "Credenciales incorrectas.", sinConfigurar: undefined });
    });

    it("flujo ok: verifica token, crea sesión y devuelve bombero", async () => {
      const cognito = await import("../lib/cognito");
      const jwt = await import("../lib/jwt");
      const sesion = await import("../lib/sesion");
      (cognito.iniciarSesion as any).mockResolvedValue({
        estado: "ok",
        tokens: { idToken: "id", accessToken: "ac", refreshToken: "rf" },
      });
      (jwt.verificarToken as any).mockResolvedValue({
        sub: "u1",
        name: "Ana",
        "cognito:groups": ["Jefatura"],
      });

      const { acceder } = await import(AUTH);
      const r = await acceder("ana", "ok", true);

      expect(r.estado).toBe("ok");
      expect(sesion.crearSesion).toHaveBeenCalledWith(
        expect.objectContaining({ idToken: "id" }),
        true,
      );
      if (r.estado === "ok") {
        expect(r.bombero.nombre).toBe("Ana");
      }
    });

    it("falla si el token no verifica", async () => {
      const cognito = await import("../lib/cognito");
      const jwt = await import("../lib/jwt");
      (cognito.iniciarSesion as any).mockResolvedValue({
        estado: "ok",
        tokens: { idToken: "id", accessToken: "ac" },
      });
      (jwt.verificarToken as any).mockResolvedValue(null);

      const { acceder } = await import(AUTH);
      const r = await acceder("ana", "ok", false);
      expect(r.estado).toBe("error");
      if (r.estado === "error") {
        expect(r.motivo).toMatch(/no pudo ser validado/);
      }
    });

    it("error si Cognito devuelve un estado inesperado", async () => {
      const cognito = await import("../lib/cognito");
      (cognito.iniciarSesion as any).mockResolvedValue({ estado: "otro" });
      const { acceder } = await import(AUTH);
      const r = await acceder("ana", "x", false);
      expect(r.estado).toBe("error");
    });
  });

  describe("definirClaveDefinitiva", () => {
    it("error si no hay reto guardado", async () => {
      const sesion = await import("../lib/sesion");
      (sesion.obtenerReto as any).mockResolvedValue(null);
      const { definirClaveDefinitiva } = await import(AUTH);
      const r = await definirClaveDefinitiva("NuevaClave1", false);
      expect(r.estado).toBe("error");
      if (r.estado === "error") {
        expect(r.motivo).toMatch(/expiró/);
      }
    });

    it("descarta el reto si Cognito falla", async () => {
      const sesion = await import("../lib/sesion");
      const cognito = await import("../lib/cognito");
      (sesion.obtenerReto as any).mockResolvedValue({
        usuario: "ana",
        sesion: "sess",
      });
      (cognito.establecerNuevaClave as any).mockResolvedValue({
        estado: "error",
        motivo: "no cumple la política",
      });

      const { definirClaveDefinitiva } = await import(AUTH);
      const r = await definirClaveDefinitiva("xxx", false);

      expect(r.estado).toBe("error");
      expect(sesion.descartarReto).toHaveBeenCalled();
    });

    it("éxito: crea sesión con el nuevo token", async () => {
      const sesion = await import("../lib/sesion");
      const cognito = await import("../lib/cognito");
      const jwt = await import("../lib/jwt");
      (sesion.obtenerReto as any).mockResolvedValue({
        usuario: "ana",
        sesion: "sess",
      });
      (cognito.establecerNuevaClave as any).mockResolvedValue({
        estado: "ok",
        tokens: { idToken: "id2", accessToken: "ac2" },
      });
      (jwt.verificarToken as any).mockResolvedValue({ sub: "u1", name: "Ana" });

      const { definirClaveDefinitiva } = await import(AUTH);
      const r = await definirClaveDefinitiva("NuevaClave1", true);

      expect(r.estado).toBe("ok");
      expect(sesion.crearSesion).toHaveBeenCalledWith(
        expect.objectContaining({ idToken: "id2" }),
        true,
      );
    });
  });
});