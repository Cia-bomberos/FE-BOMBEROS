import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookies),
}));

vi.mock("../lib/jwt", () => ({
  verificarToken: vi.fn(),
}));

vi.mock("../lib/cognito", () => ({
  cerrarSesionCognito: vi.fn(),
}));

vi.mock("../lib/tipos", () => ({
  bomberoDesdeClaims: vi.fn((c) => ({ nombre: "Ana", grado: "Teniente CBP", ...c })),
}));

describe("sesion", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...process.env };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("obtenerSesion", () => {
    it("devuelve null si no hay cookie id", async () => {
      mockCookies.get.mockReturnValue(undefined);
      const { obtenerSesion } = await import("../lib/sesion");
      expect(await obtenerSesion()).toBeNull();
    });

    it("devuelve null si el token no verifica", async () => {
      mockCookies.get.mockReturnValue({ value: "token" });
      const jwt = await import("../lib/jwt");
      (jwt.verificarToken as any).mockResolvedValue(null);
      const { obtenerSesion } = await import("../lib/sesion");
      expect(await obtenerSesion()).toBeNull();
    });

    it("devuelve el bombero si el token verifica", async () => {
      mockCookies.get.mockReturnValue({ value: "token" });
      const jwt = await import("../lib/jwt");
      (jwt.verificarToken as any).mockResolvedValue({ sub: "u1", name: "Ana" });
      const { obtenerSesion } = await import("../lib/sesion");
      const b = await obtenerSesion();
      expect(b?.nombre).toBe("Ana");
    });
  });

  describe("obtenerTokenApi", () => {
    it("usa la cookie de acceso por defecto", async () => {
      mockCookies.get.mockImplementation((k) => (k === "f3_ac" ? { value: "acc" } : undefined));
      const { obtenerTokenApi } = await import("../lib/sesion");
      expect(await obtenerTokenApi()).toBe("acc");
    });

    it("usa la cookie id si API_GATEWAY_TOKEN=id", async () => {
      process.env.API_GATEWAY_TOKEN = "id";
      mockCookies.get.mockImplementation((k) => (k === "f3_id" ? { value: "id-token" } : undefined));
      const { obtenerTokenApi } = await import("../lib/sesion");
      expect(await obtenerTokenApi()).toBe("id-token");
      delete process.env.API_GATEWAY_TOKEN;
    });

    it("devuelve null si no hay cookie", async () => {
      mockCookies.get.mockReturnValue(undefined);
      const { obtenerTokenApi } = await import("../lib/sesion");
      expect(await obtenerTokenApi()).toBeNull();
    });
  });

  describe("crearSesion y cerrarSesion", () => {
    it("crearSesion guarda las tres cookies", async () => {
      const { crearSesion } = await import("../lib/sesion");
      await crearSesion(
        { idToken: "i", accessToken: "a", refreshToken: "r" } as any,
        false,
      );
      expect(mockCookies.set).toHaveBeenCalledWith("f3_id", "i", expect.any(Object));
      expect(mockCookies.set).toHaveBeenCalledWith("f3_ac", "a", expect.any(Object));
      expect(mockCookies.set).toHaveBeenCalledWith("f3_rf", "r", expect.any(Object));
    });

    it("crearSesion arranca la cuenta de inactividad", async () => {
      const { crearSesion } = await import("../lib/sesion");
      await crearSesion({ idToken: "i", accessToken: "a" } as any, false);
      const llamada = mockCookies.set.mock.calls.find((c) => c[0] === "f3_act");
      expect(Number(llamada?.[1])).toBeGreaterThan(0);
      expect(llamada?.[2]).toMatchObject({ httpOnly: true });
    });

    it("crearSesion sin refreshToken no guarda f3_rf", async () => {
      const { crearSesion } = await import("../lib/sesion");
      await crearSesion({ idToken: "i", accessToken: "a" } as any, true);
      const llamadas = mockCookies.set.mock.calls.map((c) => c[0]);
      expect(llamadas).not.toContain("f3_rf");
    });

    it("cerrarSesion borra todas las cookies y revoca en Cognito", async () => {
      mockCookies.get.mockReturnValue({ value: "acc" });
      const cognito = await import("../lib/cognito");
      const { cerrarSesion } = await import("../lib/sesion");
      await cerrarSesion();
      expect(cognito.cerrarSesionCognito).toHaveBeenCalledWith("acc");
    });

    it("cerrarSesion sin accessToken no llama a Cognito", async () => {
      mockCookies.get.mockReturnValue(undefined);
      const cognito = await import("../lib/cognito");
      const { cerrarSesion } = await import("../lib/sesion");
      await cerrarSesion();
      expect(cognito.cerrarSesionCognito).not.toHaveBeenCalled();
    });
  });

  describe("reto de contraseña", () => {
    it("guarda y recupera el reto", async () => {
      const { guardarReto, obtenerReto } = await import("../lib/sesion");
      await guardarReto({ usuario: "u", sesion: "s" });
      const crudo = mockCookies.set.mock.calls.at(-1)?.[1];
      mockCookies.get.mockReturnValue({ value: crudo });
      expect(await obtenerReto()).toEqual({ usuario: "u", sesion: "s" });
    });

    it("obtenerReto devuelve null si no hay cookie", async () => {
      mockCookies.get.mockReturnValue(undefined);
      const { obtenerReto } = await import("../lib/sesion");
      expect(await obtenerReto()).toBeNull();
    });

    it("obtenerReto devuelve null si el JSON es inválido", async () => {
      mockCookies.get.mockReturnValue({ value: "no-json" });
      const { obtenerReto } = await import("../lib/sesion");
      expect(await obtenerReto()).toBeNull();
    });

    it("obtenerReto devuelve null si falta usuario o sesión", async () => {
      mockCookies.get.mockReturnValue({ value: JSON.stringify({ usuario: "u" }) });
      const { obtenerReto } = await import("../lib/sesion");
      expect(await obtenerReto()).toBeNull();
    });

    it("descartarReto borra la cookie", async () => {
      const { descartarReto } = await import("../lib/sesion");
      await descartarReto();
      expect(mockCookies.delete).toHaveBeenCalledWith("f3_reto");
    });
  });
});