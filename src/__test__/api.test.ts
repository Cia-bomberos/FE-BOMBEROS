import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const API = "../lib/api";

vi.mock("../lib/sesion", () => ({
  obtenerTokenApi: vi.fn(async () => "token-abc"),
}));

describe("apiFetch", () => {
  const envOriginal = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...envOriginal, API_GATEWAY_URL: "https://api.test" };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = envOriginal;
    vi.restoreAllMocks();
  });

  it("devuelve sinConfigurar si API_GATEWAY_URL está vacía", async () => {
    delete process.env.API_GATEWAY_URL;
    const { apiFetch } = await import(API);
    const r = await apiFetch("/x");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.sinConfigurar).toBe(true);
  });

  it("devuelve 401 si no hay token y no es público", async () => {
    const sesion = await import("../lib/sesion");
    (sesion.obtenerTokenApi as any).mockResolvedValueOnce(null);
    const { apiFetch } = await import(API);
    const r = await apiFetch("/x");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.estado).toBe(401);
  });

  it("omite token si sinAutenticar", async () => {
    const sesion = await import("../lib/sesion");
    (sesion.obtenerTokenApi as any).mockClear();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ hola: 1 }),
    }) as any;
    const { apiFetch } = await import(API);
    const r = await apiFetch("/p", { sinAutenticar: true });
    expect(r.ok).toBe(true);
    expect(sesion.obtenerTokenApi).not.toHaveBeenCalled();
  });

  it("envía Authorization Bearer con token", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ ok: 1 }),
    }) as any;
    const { apiFetch } = await import(API);
    await apiFetch("/x");
    const [, init] = (global.fetch as any).mock.calls[0];
    expect(init.headers.Authorization).toBe("token-abc");
  });

  it("añade Content-Type al enviar cuerpo", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "{}",
    }) as any;
    const { apiFetch } = await import(API);
    await apiFetch("/x", { metodo: "POST", cuerpo: { a: 1 } });
    const [, init] = (global.fetch as any).mock.calls[0];
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("devuelve error de red como 503", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("boom")) as any;
    const { apiFetch } = await import(API);
    const r = await apiFetch("/x");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.estado).toBe(503);
  });

  it("devuelve 408 en abort", async () => {
    global.fetch = vi.fn().mockRejectedValue(Object.assign(new Error(), { name: "AbortError" })) as any;
    const { apiFetch } = await import(API);
    const r = await apiFetch("/x");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.estado).toBe(408);
  });

  it("extrae mensaje del backend", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ mensaje: "Datos inválidos" }),
    }) as any;
    const { apiFetch } = await import(API);
    const r = await apiFetch("/x");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe("Datos inválidos");
  });

  it("traduce 401/403/429 si no hay mensaje", async () => {
    const casos = [
      [401, "Su sesión expiró. Vuelva a ingresar."],
      [403, "No tiene permisos para esta operación."],
      [429, "Demasiadas solicitudes. Espere unos segundos e intente de nuevo."],
    ];
    for (const [code, msg] of casos) {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: code,
        text: async () => "",
      }) as any;
      const { apiFetch } = await import(API);
      const r = await apiFetch("/x");
      if (!r.ok) expect(r.motivo).toBe(msg);
    }
  });

  it("apiConfigurada refleja el entorno", async () => {
    const { apiConfigurada } = await import(API);
    expect(apiConfigurada()).toBe(true);

    delete process.env.API_GATEWAY_URL;
    vi.resetModules();
    const mod = await import(API);
    expect(mod.apiConfigurada()).toBe(false);
  });
});