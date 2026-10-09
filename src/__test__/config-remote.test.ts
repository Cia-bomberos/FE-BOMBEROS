// src/__test__/config-remote.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CONFIG = "../lib/config-remote";

describe("config-remote", () => {
  const envOriginal = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...envOriginal,
      STAGE: "test",
      COGNITO_USER_POOL_ID: "us-east-1_pool",
      COGNITO_CLIENT_ID: "client-local",
      API_GATEWAY_URL: "https://api.local",
    };
  });

  afterEach(() => {
    process.env = envOriginal;
    vi.restoreAllMocks();
  });

  it("descarga la config remota cuando la respuesta es OK", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stage: "prod",
        userPoolId: "us-east-1_remoto",
        clientId: "client-remoto",
        apiUrl: "https://api.remoto",
        region: "us-east-1",
      }),
    }) as any;

    const { obtenerConfigRemota } = await import(CONFIG);
    const config = await obtenerConfigRemota();

    expect(config.userPoolId).toBe("us-east-1_remoto");
    expect(config.clientId).toBe("client-remoto");
    expect(config.apiUrl).toBe("https://api.remoto");
  });

  it("usa fallback a .env si el fetch falla por HTTP", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    }) as any;

    const { obtenerConfigRemota } = await import(CONFIG);
    const config = await obtenerConfigRemota();

    expect(config.userPoolId).toBe("us-east-1_pool");
    expect(config.clientId).toBe("client-local");
    expect(config.apiUrl).toBe("https://api.local");
    expect(spy).toHaveBeenCalled();
  });

  it("usa fallback si fetch lanza excepción de red", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("network")) as any;

    const { obtenerConfigRemota } = await import(CONFIG);
    const config = await obtenerConfigRemota();

    expect(config.userPoolId).toBe("us-east-1_pool");
    expect(config.apiUrl).toBe("https://api.local");
  });

  it("cachea la config: el segundo llamado no vuelve a hacer fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stage: "prod",
        userPoolId: "p",
        clientId: "c",
        apiUrl: "u",
        region: "us-east-1",
      }),
    });
    global.fetch = fetchMock as any;

    const { obtenerConfigRemota } = await import(CONFIG);
    await obtenerConfigRemota();
    await obtenerConfigRemota();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("usa STAGE=dev por defecto cuando no está definido", async () => {
    delete process.env.STAGE;
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "err",
    });
    global.fetch = fetchMock as any;
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { obtenerConfigRemota } = await import(CONFIG);
    await obtenerConfigRemota();

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("bomberos-config-dev");
  });

  it("construye la URL con el STAGE recibido", async () => {
    process.env.STAGE = "prod";
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "err",
    });
    global.fetch = fetchMock as any;
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { obtenerConfigRemota } = await import(CONFIG);
    await obtenerConfigRemota();

    expect(fetchMock.mock.calls[0][0]).toContain("bomberos-config-prod");
  });

  it("region siempre es us-east-1 en el fallback", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("x")) as any;

    const { obtenerConfigRemota } = await import(CONFIG);
    const config = await obtenerConfigRemota();
    expect(config.region).toBe("us-east-1");
  });

  describe("obtenerConfigBandeja", () => {
    it("lee bandeja-config.json del bucket de la bandeja según STAGE", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ stage: "test", apiUrl: "https://bandeja.remota/test" }),
      });
      global.fetch = fetchMock as any;

      const { obtenerConfigBandeja } = await import(CONFIG);
      const config = await obtenerConfigBandeja();

      expect(config?.apiUrl).toBe("https://bandeja.remota/test");
      expect(fetchMock.mock.calls[0][0]).toBe(
        "https://bomberos-f3-bandeja-cfg-test.s3.amazonaws.com/bandeja-config.json",
      );
    });

    it("devuelve null sin usar .env si la descarga falla", async () => {
      process.env.API_GATEWAY_BANDEJA = "https://bandeja.local";
      vi.spyOn(console, "error").mockImplementation(() => {});
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403, statusText: "Forbidden" }) as any;

      const { obtenerConfigBandeja } = await import(CONFIG);
      expect(await obtenerConfigBandeja()).toBeNull();
    });

    it("devuelve null si el JSON no trae apiUrl", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ stage: "test" }) }) as any;

      const { obtenerConfigBandeja } = await import(CONFIG);
      expect(await obtenerConfigBandeja()).toBeNull();
    });

    it("cachea solo los aciertos: tras un fallo vuelve a intentar", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new Error("network"))
        .mockResolvedValue({ ok: true, json: async () => ({ stage: "test", apiUrl: "u" }) });
      global.fetch = fetchMock as any;

      const { obtenerConfigBandeja } = await import(CONFIG);
      expect(await obtenerConfigBandeja()).toBeNull();
      expect(await obtenerConfigBandeja()).toMatchObject({ apiUrl: "u" });
      await obtenerConfigBandeja();

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
