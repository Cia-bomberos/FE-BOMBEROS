import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";


const MW = "../middleware";



function fakeRequest(cookies: Record<string, string>, url = "https://x/panel") {
  const store = new Map(Object.entries(cookies));
  return {
    url,
    cookies: {
      get: (k: string) => (store.has(k) ? { value: store.get(k) } : undefined),
    },
  } as any;
}

function tokenConExp(exp: number, extra: Record<string, unknown> = {}) {
  const payload = Buffer.from(
    JSON.stringify({ exp, "cognito:username": "ana", sub: "s1", ...extra }),
  ).toString("base64url");
  return `header.${payload}.firma`;
}

describe("middleware", () => {
  const envOriginal = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...envOriginal,
      COGNITO_REGION: "us-east-1",
      COGNITO_CLIENT_ID: "client",
    };
  });

  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });

  afterEach(() => {
    process.env = envOriginal;
    vi.restoreAllMocks();
  });

  it("pasa de largo si no hay idToken", async () => {
    const { middleware } = await import(MW);
    const r = await middleware(fakeRequest({}));
    // NextResponse.next() no tiene redirect
    expect(r.headers.get("location")).toBeNull();
  });

  it("pasa si el token sigue vigente", async () => {
    const { middleware } = await import(MW);
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const r = await middleware(fakeRequest({ f3_id: tokenConExp(exp) }));
    expect(r.headers.get("location")).toBeNull();
  });

  it("redirige a login si no hay refresh token", async () => {
    const { middleware } = await import(MW);
    const exp = Math.floor(Date.now() / 1000) - 10;
    const r = await middleware(fakeRequest({ f3_id: tokenConExp(exp) }));
    expect(r.headers.get("location")).toContain("/login");
  });

  it("redirige a login si el refresh falla", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as any;
    const { middleware } = await import(MW);
    const exp = Math.floor(Date.now() / 1000) - 10;
    const r = await middleware(
      fakeRequest({ f3_id: tokenConExp(exp), f3_rf: "refresh" }),
    );
    expect(r.headers.get("location")).toContain("/login");
  });

  it("renueva y setea cookies nuevas", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        AuthenticationResult: { IdToken: "new-id", AccessToken: "new-acc" },
      }),
    }) as any;
    const { middleware } = await import(MW);
    const exp = Math.floor(Date.now() / 1000) - 10;
    const r = await middleware(
      fakeRequest({ f3_id: tokenConExp(exp), f3_rf: "refresh" }),
    );
    expect(r.cookies.get("f3_id")?.value).toBe("new-id");
    expect(r.cookies.get("f3_ac")?.value).toBe("new-acc");
  });

  it("devuelve null si falta config de Cognito", async () => {
    delete process.env.COGNITO_REGION;
    const { middleware } = await import(MW);
    const exp = Math.floor(Date.now() / 1000) - 10;
    const r = await middleware(
      fakeRequest({ f3_id: tokenConExp(exp), f3_rf: "refresh" }),
    );
    expect(r.headers.get("location")).toContain("/login");
  });

  it("usa SECRET_HASH si hay CLIENT_SECRET", async () => {
    process.env.COGNITO_CLIENT_SECRET = "secret";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        AuthenticationResult: { IdToken: "n", AccessToken: "a" },
      }),
    });
    global.fetch = fetchMock as any;
    const { middleware } = await import(MW);
    const exp = Math.floor(Date.now() / 1000) - 10;
    await middleware(fakeRequest({ f3_id: tokenConExp(exp), f3_rf: "r" }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.AuthParameters.SECRET_HASH).toBeDefined();
  });

  it("maneja fetch que lanza excepción", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network")) as any;
    const { middleware } = await import(MW);
    const exp = Math.floor(Date.now() / 1000) - 10;
    const r = await middleware(
      fakeRequest({ f3_id: tokenConExp(exp), f3_rf: "r" }),
    );
    expect(r.headers.get("location")).toContain("/login");
  });
});