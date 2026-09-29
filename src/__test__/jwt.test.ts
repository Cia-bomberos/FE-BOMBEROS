import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync, createSign } from "node:crypto";

const JWT = "../lib/jwt";

function base64url(buf: Buffer | string) {
  return Buffer.from(buf).toString("base64url");
}

vi.mock("../lib/config-remote", () => ({
  obtenerConfigRemota: vi.fn().mockResolvedValue(null),
}));

function firmarToken(
  claims: Record<string, unknown>,
  privateKey: string,
  kid = "kid-1",
  alg = "RS256",
): string {
  const header = base64url(JSON.stringify({ alg, kid, typ: "JWT" }));
  const payload = base64url(JSON.stringify(claims));
  const data = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(data);
  signer.end();
  const firma = signer.sign(privateKey);
  return `${data}.${base64url(firma)}`;
}

const { publicKey: publicJwk, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { format: "jwk" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const jwk = {
  ...publicJwk,
  kid: "kid-1",
  use: "sig",
  alg: "RS256",
};
jwk.kid = "kid-1";
jwk.use = "sig";
jwk.alg = "RS256";

describe("jwt - verificarToken", () => {
  const envOriginal = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...envOriginal,
      COGNITO_REGION: "us-east-1",
      COGNITO_USER_POOL_ID: "us-east-1_test",
      COGNITO_CLIENT_ID: "client-test",
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [jwk] }),
    }) as any;
  });

  afterEach(() => {
    process.env = envOriginal;
    vi.restoreAllMocks();
  });

  const claimsValidos = (extra = {}) => ({
    sub: "u1",
    iss: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test",
    token_use: "id",
    aud: "client-test",
    exp: Math.floor(Date.now() / 1000) + 600,
    ...extra,
  });

  it("devuelve null si Cognito no está configurado", async () => {
    delete process.env.COGNITO_REGION;
    const { verificarToken } = await import(JWT);
    expect(await verificarToken("a.b.c")).toBeNull();
  });

  it("devuelve null si el token no tiene 3 partes", async () => {
    const { verificarToken } = await import(JWT);
    expect(await verificarToken("solo-dos.partes")).toBeNull();
  });

  it("devuelve null si alg no es RS256", async () => {
    const { verificarToken } = await import(JWT);
    const t = firmarToken(claimsValidos(), privateKey, "kid-1", "none");
    expect(await verificarToken(t)).toBeNull();
  });

  it("devuelve null si el kid no existe en el JWKS", async () => {
    const { verificarToken } = await import(JWT);
    const t = firmarToken(claimsValidos(), privateKey, "otro-kid");
    expect(await verificarToken(t)).toBeNull();
  });

  it("acepta un token válido", async () => {
    const { verificarToken } = await import(JWT);
    const t = firmarToken(claimsValidos(), privateKey);
    const r = await verificarToken(t);
    expect(r?.sub).toBe("u1");
  });

  it("rechaza si el iss no coincide", async () => {
    const { verificarToken } = await import(JWT);
    const t = firmarToken(claimsValidos({ iss: "https://otro" }), privateKey);
    expect(await verificarToken(t)).toBeNull();
  });

  it("rechaza si token_use no coincide", async () => {
    const { verificarToken } = await import(JWT);
    const t = firmarToken(claimsValidos({ token_use: "access" }), privateKey);
    expect(await verificarToken(t, "id")).toBeNull();
  });

  it("rechaza si el aud no coincide", async () => {
    const { verificarToken } = await import(JWT);
    const t = firmarToken(claimsValidos({ aud: "otro" }), privateKey);
    expect(await verificarToken(t)).toBeNull();
  });

  it("rechaza si expiró", async () => {
    const { verificarToken } = await import(JWT);
    const t = firmarToken(claimsValidos({ exp: 1 }), privateKey);
    expect(await verificarToken(t)).toBeNull();
  });

  it("acepta access token usando client_id", async () => {
    const { verificarToken } = await import(JWT);
    const t = firmarToken(
      claimsValidos({ token_use: "access", client_id: "client-test", aud: undefined }),
      privateKey,
    );
    expect(await verificarToken(t, "access")).not.toBeNull();
  });

  it("rechaza access token si client_id no coincide", async () => {
    const { verificarToken } = await import(JWT);
    const t = firmarToken(
      claimsValidos({ token_use: "access", client_id: "otro" }),
      privateKey,
    );
    expect(await verificarToken(t, "access")).toBeNull();
  });

  it("rechaza si la firma no verifica", async () => {
    const { verificarToken } = await import(JWT);
    const t = firmarToken(claimsValidos(), privateKey);
    // alteramos la firma
    const partes = t.split(".");
    partes[2] = base64url("firmafalsa");
    expect(await verificarToken(partes.join("."))).toBeNull();
  });

  it("rechaza si JWKS devuelve error", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as any;
    const { verificarToken } = await import(JWT);
    const t = firmarToken(claimsValidos(), privateKey);
    expect(await verificarToken(t)).toBeNull();
  });
});

describe("jwt - utilidades", () => {
  it("leerClaims devuelve null si no hay payload", async () => {
    const { leerClaims } = await import(JWT);
    expect(leerClaims("solo-uno")).toBeNull();
  });

  it("expirado devuelve true si exp ya pasó", async () => {
    const { expirado } = await import(JWT);
    expect(expirado({ exp: 1 } as any)).toBe(true);
  });

  it("expirado respeta margen", async () => {
    const { expirado } = await import(JWT);
    const futuro = Math.floor(Date.now() / 1000) + 30;
    expect(expirado({ exp: futuro } as any, 60)).toBe(true);
    expect(expirado({ exp: futuro } as any, 10)).toBe(false);
  });
});