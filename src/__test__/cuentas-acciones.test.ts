// src/__test__/cuentas-acciones.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));
vi.mock("../lib/sesion", () => ({ obtenerSesion: vi.fn() }));
vi.mock("../lib/cuentas-api", () => ({
  cambiarPasswordCuenta: vi.fn(),
  validarPolitica: vi.fn(),
}));
vi.mock("../lib/roles", () => ({
  ROL_JEFATURA: "Jefatura",
  rolPorClave: vi.fn(),
  ROLES_ADMINISTRABLES: ["Comandancia", "Segundo_Jefe"],
}));
vi.mock("../lib/secciones", () => ({ esJefatura: vi.fn() }));

const ACCIONES = "../app/panel/cuentas/acciones";

const jefe = { sub: "u1", nombre: "Ana", grupos: ["Jefatura"] } as any;
const noJefe = { sub: "u2", nombre: "Luis", grupos: [] } as any;

describe("cuentas/acciones - cambiarPassword", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("redirige a login si no hay sesión", async () => {
    const sesion = await import("../lib/sesion");
    (sesion.obtenerSesion as any).mockResolvedValue(null);
    const { cambiarPassword } = await import(ACCIONES);
    await expect(
      cambiarPassword({} as any, new FormData()),
    ).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("rechaza si no es jefatura", async () => {
    const sesion = await import("../lib/sesion");
    const secciones = await import("../lib/secciones");
    (sesion.obtenerSesion as any).mockResolvedValue(noJefe);
    (secciones.esJefatura as any).mockReturnValue(false);

    const { cambiarPassword } = await import(ACCIONES);
    const r = await cambiarPassword({} as any, new FormData());
    expect(r.estado).toBe("error");
    expect(r.mensaje).toMatch(/Solo la Jefatura/);
  });

  it("rechaza si el grupo es Jefatura (RN-0043)", async () => {
    const sesion = await import("../lib/sesion");
    const secciones = await import("../lib/secciones");
    const roles = await import("../lib/roles");
    (sesion.obtenerSesion as any).mockResolvedValue(jefe);
    (secciones.esJefatura as any).mockReturnValue(true);
    (roles.rolPorClave as any).mockReturnValue({ clave: "Jefatura" });

    const { cambiarPassword } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("username", "x");
    fd.set("grupo", "Jefatura");
    const r = await cambiarPassword({} as any, fd);
    expect(r.estado).toBe("error");
    expect(r.mensaje).toMatch(/no puede modificarse/);
  });

  it("rechaza si el grupo no es administrable", async () => {
    const sesion = await import("../lib/sesion");
    const secciones = await import("../lib/secciones");
    const roles = await import("../lib/roles");
    (sesion.obtenerSesion as any).mockResolvedValue(jefe);
    (secciones.esJefatura as any).mockReturnValue(true);
    (roles.rolPorClave as any).mockReturnValue({ clave: "Otro_Rol" });

    const { cambiarPassword } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("username", "x");
    fd.set("grupo", "Otro_Rol");
    const r = await cambiarPassword({} as any, fd);
    expect(r.estado).toBe("error");
  });

  it("rechaza si la política de contraseña falla", async () => {
    const sesion = await import("../lib/sesion");
    const secciones = await import("../lib/secciones");
    const roles = await import("../lib/roles");
    const api = await import("../lib/cuentas-api");
    (sesion.obtenerSesion as any).mockResolvedValue(jefe);
    (secciones.esJefatura as any).mockReturnValue(true);
    (roles.rolPorClave as any).mockReturnValue({ clave: "Comandancia" });
    (api.validarPolitica as any).mockReturnValue("Debe incluir un número.");

    const { cambiarPassword } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("username", "comandancia");
    fd.set("grupo", "Comandancia");
    fd.set("nueva", "SinNumeroA");
    fd.set("confirmacion", "SinNumeroA");
    const r = await cambiarPassword({} as any, fd);
    expect(r.estado).toBe("error");
    expect(r.campo).toBe("nueva-comandancia");
  });

  it("rechaza si las contraseñas no coinciden", async () => {
    const sesion = await import("../lib/sesion");
    const secciones = await import("../lib/secciones");
    const roles = await import("../lib/roles");
    const api = await import("../lib/cuentas-api");
    (sesion.obtenerSesion as any).mockResolvedValue(jefe);
    (secciones.esJefatura as any).mockReturnValue(true);
    (roles.rolPorClave as any).mockReturnValue({ clave: "Comandancia" });
    (api.validarPolitica as any).mockReturnValue(null);

    const { cambiarPassword } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("username", "comandancia");
    fd.set("grupo", "Comandancia");
    fd.set("nueva", "Nueva1");
    fd.set("confirmacion", "Otra2");
    const r = await cambiarPassword({} as any, fd);
    expect(r.estado).toBe("error");
    expect(r.campo).toBe("confirmacion-comandancia");
  });

  it("propaga error de cambiarPasswordCuenta", async () => {
    const sesion = await import("../lib/sesion");
    const secciones = await import("../lib/secciones");
    const roles = await import("../lib/roles");
    const api = await import("../lib/cuentas-api");
    (sesion.obtenerSesion as any).mockResolvedValue(jefe);
    (secciones.esJefatura as any).mockReturnValue(true);
    (roles.rolPorClave as any).mockReturnValue({ clave: "Comandancia" });
    (api.validarPolitica as any).mockReturnValue(null);
    (api.cambiarPasswordCuenta as any).mockResolvedValue({
      ok: false,
      motivo: "boom",
    });

    const { cambiarPassword } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("username", "comandancia");
    fd.set("grupo", "Comandancia");
    fd.set("nueva", "NuevaClave1");
    fd.set("confirmacion", "NuevaClave1");
    const r = await cambiarPassword({} as any, fd);
    expect(r.estado).toBe("error");
    expect(r.mensaje).toBe("boom");
  });

  it("éxito: usa el mensaje del backend si viene", async () => {
    const sesion = await import("../lib/sesion");
    const secciones = await import("../lib/secciones");
    const roles = await import("../lib/roles");
    const api = await import("../lib/cuentas-api");
    (sesion.obtenerSesion as any).mockResolvedValue(jefe);
    (secciones.esJefatura as any).mockReturnValue(true);
    (roles.rolPorClave as any).mockReturnValue({ clave: "Comandancia" });
    (api.validarPolitica as any).mockReturnValue(null);
    (api.cambiarPasswordCuenta as any).mockResolvedValue({
      ok: true,
      datos: { mensaje: "Cambio aplicado" },
    });

    const { cambiarPassword } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("username", "comandancia");
    fd.set("grupo", "Comandancia");
    fd.set("nueva", "NuevaClave1");
    fd.set("confirmacion", "NuevaClave1");
    const r = await cambiarPassword({} as any, fd);
    expect(r.estado).toBe("ok");
    expect(r.mensaje).toBe("Cambio aplicado");
  });

  it("éxito: mensaje por defecto si backend no da mensaje", async () => {
    const sesion = await import("../lib/sesion");
    const secciones = await import("../lib/secciones");
    const roles = await import("../lib/roles");
    const api = await import("../lib/cuentas-api");
    (sesion.obtenerSesion as any).mockResolvedValue(jefe);
    (secciones.esJefatura as any).mockReturnValue(true);
    (roles.rolPorClave as any).mockReturnValue({ clave: "Comandancia" });
    (api.validarPolitica as any).mockReturnValue(null);
    (api.cambiarPasswordCuenta as any).mockResolvedValue({
      ok: true,
      datos: { mensaje: "" },
    });

    const { cambiarPassword } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("username", "comandancia");
    fd.set("grupo", "Comandancia");
    fd.set("nueva", "NuevaClave1");
    fd.set("confirmacion", "NuevaClave1");
    const r = await cambiarPassword({} as any, fd);
    expect(r.estado).toBe("ok");
    expect(r.mensaje).toMatch(/comandancia/);
  });
});