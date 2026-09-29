// src/__test__/tema-servidor.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookies),
}));

const TEMA_SERVIDOR = "../lib/tema-servidor";

describe("tema-servidor", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => vi.restoreAllMocks());

  it("devuelve el tema de la cookie si es válido", async () => {
    mockCookies.get.mockReturnValue({ value: "light" });
    const { obtenerTema } = await import(TEMA_SERVIDOR);
    expect(await obtenerTema()).toBe("light");
  });

  it("devuelve dark si la cookie dice dark", async () => {
    mockCookies.get.mockReturnValue({ value: "dark" });
    const { obtenerTema } = await import(TEMA_SERVIDOR);
    expect(await obtenerTema()).toBe("dark");
  });

  it("devuelve el tema por defecto si no hay cookie", async () => {
    mockCookies.get.mockReturnValue(undefined);
    const { obtenerTema } = await import(TEMA_SERVIDOR);
    expect(await obtenerTema()).toBe("dark");
  });

  it("devuelve el tema por defecto si la cookie no es válida", async () => {
    mockCookies.get.mockReturnValue({ value: "auto" });
    const { obtenerTema } = await import(TEMA_SERVIDOR);
    expect(await obtenerTema()).toBe("dark");
  });

  it("lee la cookie con el nombre correcto", async () => {
    mockCookies.get.mockReturnValue({ value: "light" });
    const { obtenerTema } = await import(TEMA_SERVIDOR);
    await obtenerTema();
    expect(mockCookies.get).toHaveBeenCalledWith("f3_tema");
  });
});