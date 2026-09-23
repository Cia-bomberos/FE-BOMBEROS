import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const COGNITO = "../lib/cognito";

describe("cognito - iniciarSesion y traducción de errores", () => {
  const envOriginal = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...envOriginal,
      COGNITO_REGION: "us-east-1",
      COGNITO_USER_POOL_ID: "us-east-1_example",
      COGNITO_CLIENT_ID: "client_id_example",
    };
  });

  afterEach(() => {
    process.env = envOriginal;
    vi.restoreAllMocks();
  });

  it("debe retornar error no configurado si faltan variables de entorno", async () => {
    delete process.env.COGNITO_REGION;
    const { iniciarSesion } = await import(COGNITO);

    const resultado = await iniciarSesion("usuario", "clave");
    expect(resultado).toEqual({
      estado: "error",
      sinConfigurar: true,
      motivo:
        "El servicio de autenticación aún no está configurado. Defina las variables de Cognito.",
    });
  });

  it("debe traducir correctamente errores de credenciales inválidas (NotAuthorizedException)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ __type: "NotAuthorizedException", message: "Error" }),
    });

    const { iniciarSesion } = await import(COGNITO);
    const resultado = await iniciarSesion("usuario", "clave_incorrecta");

    expect(resultado).toEqual({
      estado: "error",
      motivo: "Credenciales incorrectas. Verifique su usuario y contraseña.",
    });
  });

  it("debe manejar respuestas exitosas con tokens de Cognito", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        AuthenticationResult: {
          IdToken: "mock-id-token",
          AccessToken: "mock-access-token",
          RefreshToken: "mock-refresh-token",
          ExpiresIn: 3600,
        },
      }),
    });

    const { iniciarSesion } = await import(COGNITO);
    const resultado = await iniciarSesion("usuario", "clave_valida");

    expect(resultado).toEqual({
      estado: "ok",
      tokens: {
        idToken: "mock-id-token",
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        expiraEn: 3600,
      },
    });
  });
});