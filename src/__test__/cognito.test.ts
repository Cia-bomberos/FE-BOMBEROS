// src/__test__/cognito.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const COGNITO = "../lib/cognito";

const configFake = {
  stage: "test",
  userPoolId: "us-east-1_test",
  clientId: "client-test",
  apiUrl: "https://api.test",
  region: "us-east-1" as const,
};

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

    vi.doMock("../lib/config-remote", () => ({
      obtenerConfigRemota: vi.fn().mockResolvedValue({
        ...configFake,
        userPoolId: "us-east-1_example",
        clientId: "client_id_example",
      }),
    }));
  });

  afterEach(() => {
    process.env = envOriginal;
    vi.restoreAllMocks();
    vi.doUnmock("../lib/config-remote");
  });

  /* ---------------- Configuración ---------------- */

  it("debe retornar error no configurado si faltan variables de entorno", async () => {
    vi.doMock("../lib/config-remote", () => ({
      obtenerConfigRemota: vi.fn().mockResolvedValue({
        stage: "test",
        userPoolId: "",
        clientId: "",
        apiUrl: "",
        region: "us-east-1",
      }),
    }));
    delete process.env.COGNITO_REGION;
    delete process.env.COGNITO_USER_POOL_ID;
    delete process.env.COGNITO_CLIENT_ID;

    const { iniciarSesion } = await import(COGNITO);
    const resultado = await iniciarSesion("usuario", "clave");

    expect(resultado).toEqual({
      estado: "error",
      sinConfigurar: true,
      motivo:
        "El servicio de autenticación aún no está configurado. Defina las variables de Cognito.",
    });
  });

  it("emisorCognito y urlJwks usan la region y el pool configurados", async () => {
    const { emisorCognito, urlJwks } = await import(COGNITO);
    expect(emisorCognito()).toBe(
      "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_example",
    );
    expect(urlJwks()).toContain("/.well-known/jwks.json");
  });

  /* ---------------- Éxito ---------------- */

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
    }) as any;

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

  it("si Cognito no envía RefreshToken, éste queda undefined", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        AuthenticationResult: {
          IdToken: "id",
          AccessToken: "ac",
          ExpiresIn: 3600,
        },
      }),
    }) as any;

    const { iniciarSesion } = await import(COGNITO);
    const r = await iniciarSesion("usuario", "clave");
    expect(r.estado).toBe("ok");
    if (r.estado === "ok") expect(r.tokens.refreshToken).toBeUndefined();
  });

  it("ExpiresIn ausente cae a 3600", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        AuthenticationResult: { IdToken: "i", AccessToken: "a" },
      }),
    }) as any;

    const { iniciarSesion } = await import(COGNITO);
    const r = await iniciarSesion("u", "c");
    if (r.estado === "ok") expect(r.tokens.expiraEn).toBe(3600);
  });

  it("si faltan tokens en la respuesta, devuelve error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ AuthenticationResult: { IdToken: "solo-id" } }),
    }) as any;

    const { iniciarSesion } = await import(COGNITO);
    const r = await iniciarSesion("u", "c");
    expect(r.estado).toBe("error");
    if (r.estado === "error") {
      expect(r.motivo).toMatch(/no incluyó los tokens/);
    }
  });

  /* ---------------- Reto NEW_PASSWORD_REQUIRED ---------------- */

  it("devuelve reto-nueva-clave con USER_ID_FOR_SRP", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        Session: "sesion-x",
        ChallengeParameters: { USER_ID_FOR_SRP: "srp-user" },
      }),
    }) as any;

    const { iniciarSesion } = await import(COGNITO);
    const r = await iniciarSesion("usuario", "temp");
    expect(r).toEqual({
      estado: "reto-nueva-clave",
      sesion: "sesion-x",
      usuario: "srp-user",
    });
  });

  it("cae a USERNAME si no hay USER_ID_FOR_SRP", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        Session: "s",
        ChallengeParameters: { USERNAME: "username-claim" },
      }),
    }) as any;

    const { iniciarSesion } = await import(COGNITO);
    const r = await iniciarSesion("u", "c");
    if (r.estado === "reto-nueva-clave") expect(r.usuario).toBe("username-claim");
  });

  it("cae a cadena vacía si no hay ni USER_ID_FOR_SRP ni USERNAME", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        Session: "s",
      }),
    }) as any;

    const { iniciarSesion } = await import(COGNITO);
    const r = await iniciarSesion("u", "c");
    if (r.estado === "reto-nueva-clave") expect(r.usuario).toBe("");
  });

  it("rechaza otros retos (MFA) con mensaje informativo", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ChallengeName: "SMS_MFA" }),
    }) as any;

    const { iniciarSesion } = await import(COGNITO);
    const r = await iniciarSesion("u", "c");
    expect(r.estado).toBe("error");
    if (r.estado === "error") expect(r.motivo).toMatch(/SMS_MFA/);
  });

  /* ---------------- Traducción de errores HTTP ---------------- */

  const casosError: Array<[string, RegExp]> = [
    ["NotAuthorizedException", /Credenciales incorrectas/],
    ["UserNotFoundException", /Credenciales incorrectas/],
    ["UserNotConfirmedException", /aún no ha sido confirmada/],
    ["PasswordResetRequiredException", /restablecer su contraseña/],
    ["InvalidPasswordException", /política de seguridad/],
    ["TooManyRequestsException", /Demasiados intentos/],
    ["TooManyFailedAttemptsException", /Demasiados intentos/],
    ["LimitExceededException", /Demasiados intentos/],
    ["ExpiredCodeException", /sesión de cambio de contraseña expiró/],
    ["CodeMismatchException", /sesión de cambio de contraseña expiró/],
    ["ResourceNotFoundException", /User Pool o el App Client/],
    ["InvalidParameterException", /USER_PASSWORD_AUTH/],
    ["ErrorDesconocido", /No se pudo completar el acceso/],
  ];

  for (const [tipo, patron] of casosError) {
    it(`traduce ${tipo}`, async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ __type: tipo, message: "x" }),
      }) as any;

      const { iniciarSesion } = await import(COGNITO);
      const r = await iniciarSesion("u", "c");
      expect(r.estado).toBe("error");
      if (r.estado === "error") expect(r.motivo).toMatch(patron);
    });
  }

  it("maneja __type con prefijo tipo AWS (#)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        __type: "com.amazonaws.cognito#NotAuthorizedException",
      }),
    }) as any;

    const { iniciarSesion } = await import(COGNITO);
    const r = await iniciarSesion("u", "c");
    if (r.estado === "error") {
      expect(r.motivo).toMatch(/Credenciales incorrectas/);
    }
  });

  it("loguea ResourceNotFound e InvalidParameter a stderr", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ __type: "ResourceNotFoundException", message: "no" }),
    }) as any;

    const { iniciarSesion } = await import(COGNITO);
    await iniciarSesion("u", "c");
    expect(spy).toHaveBeenCalled();
  });

  /* ---------------- Errores de transporte ---------------- */

  it("maneja respuesta no-JSON", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error("no-json");
      },
    }) as any;

    const { iniciarSesion } = await import(COGNITO);
    const r = await iniciarSesion("u", "c");
    expect(r.estado).toBe("error");
  });

  it("devuelve 408 en abort/timeout", async () => {
    global.fetch = vi.fn().mockRejectedValue(
      Object.assign(new Error(), { name: "AbortError" }),
    ) as any;

    const { iniciarSesion } = await import(COGNITO);
    const r = await iniciarSesion("u", "c");
    if (r.estado === "error") expect(r.motivo).toMatch(/no respondió a tiempo/);
  });

  it("devuelve error genérico si fetch lanza", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("boom")) as any;
    const { iniciarSesion } = await import(COGNITO);
    const r = await iniciarSesion("u", "c");
    if (r.estado === "error") expect(r.motivo).toMatch(/No se pudo contactar/);
  });

  /* ---------------- SECRET_HASH ---------------- */

  it("añade SECRET_HASH al body si hay CLIENT_SECRET", async () => {
    process.env.COGNITO_CLIENT_SECRET = "secret-test";
    vi.resetModules();
    vi.doMock("../lib/config-remote", () => ({
      obtenerConfigRemota: vi.fn().mockResolvedValue({
        ...configFake,
        userPoolId: "us-east-1_example",
        clientId: "client_id_example",
      }),
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        AuthenticationResult: { IdToken: "i", AccessToken: "a" },
      }),
    });
    global.fetch = fetchMock as any;

    const { iniciarSesion } = await import(COGNITO);
    await iniciarSesion("ana", "c");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.AuthParameters.SECRET_HASH).toBeDefined();
    expect(body.AuthParameters.SECRET_HASH).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("no añade SECRET_HASH si no hay CLIENT_SECRET", async () => {
    delete process.env.COGNITO_CLIENT_SECRET;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        AuthenticationResult: { IdToken: "i", AccessToken: "a" },
      }),
    });
    global.fetch = fetchMock as any;

    const { iniciarSesion } = await import(COGNITO);
    await iniciarSesion("ana", "c");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.AuthParameters.SECRET_HASH).toBeUndefined();
  });

  /* ---------------- Otras operaciones ---------------- */

  it("establecerNuevaClave envía RespondToAuthChallenge", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        AuthenticationResult: { IdToken: "i", AccessToken: "a" },
      }),
    });
    global.fetch = fetchMock as any;

    const { establecerNuevaClave } = await import(COGNITO);
    await establecerNuevaClave("u", "sesion", "NuevaClave1");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.ChallengeName).toBe("NEW_PASSWORD_REQUIRED");
    expect(body.ChallengeResponses.NEW_PASSWORD).toBe("NuevaClave1");
    expect(body.Session).toBe("sesion");
  });

  it("renovarSesion envía REFRESH_TOKEN_AUTH", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        AuthenticationResult: { IdToken: "i", AccessToken: "a" },
      }),
    });
    global.fetch = fetchMock as any;

    const { renovarSesion } = await import(COGNITO);
    await renovarSesion("rf-token", "ana");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.AuthFlow).toBe("REFRESH_TOKEN_AUTH");
    expect(body.AuthParameters.REFRESH_TOKEN).toBe("rf-token");
  });

  it("cerrarSesionCognito hace GlobalSignOut", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    global.fetch = fetchMock as any;

    const { cerrarSesionCognito } = await import(COGNITO);
    await cerrarSesionCognito("access-token");

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers["X-Amz-Target"]).toContain("GlobalSignOut");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.AccessToken).toBe("access-token");
  });

  it("cerrarSesionCognito no lanza si Cognito falla", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network")) as any;
    const { cerrarSesionCognito } = await import(COGNITO);
    await expect(cerrarSesionCognito("x")).resolves.toBeUndefined();
  });
});