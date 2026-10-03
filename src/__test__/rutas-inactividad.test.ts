import { beforeEach, describe, expect, it, vi } from "vitest";

const cerrarSesion = vi.fn();
vi.mock("../lib/sesion", () => ({ cerrarSesion }));

describe("rutas de inactividad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("el pulso de actividad responde sin contenido", async () => {
    const { POST } = await import("../app/panel/actividad/route");
    expect(POST().status).toBe(204);
  });

  it("el cierre por inactividad cierra la sesión y redirige al login", async () => {
    const { POST } = await import("../app/panel/inactividad/route");
    const r = await POST({ url: "https://x/panel/inactividad" } as any);
    expect(cerrarSesion).toHaveBeenCalledTimes(1);
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe("https://x/login?motivo=inactividad");
  });
});
