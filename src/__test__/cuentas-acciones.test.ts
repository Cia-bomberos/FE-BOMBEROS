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
  cambiarUsernameCuenta: vi.fn(),
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

describe("cuentas/acciones - cambiarUsername", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("redirige a login si no hay sesión", async () => {
    const sesion = await import("../lib/sesion");
    (sesion.obtenerSesion as any).mockResolvedValue(null);
    const { cambiarUsername } = await import(ACCIONES);
    await expect(cambiarUsername({} as any, new FormData())).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("rechaza si no es jefatura", async () => {
    const sesion = await import("../lib/sesion");
    const secciones = await import("../lib/secciones");
    (sesion.obtenerSesion as any).mockResolvedValue(noJefe);
    (secciones.esJefatura as any).mockReturnValue(false);

    const { cambiarUsername } = await import(ACCIONES);
    const r = await cambiarUsername({} as any, new FormData());
    expect(r.estado).toBe("error");
    expect(r.mensaje).toMatch(/Solo la Jefatura/);
  });

  it("rechaza si el username es muy corto", async () => {
    const sesion = await import("../lib/sesion");
    const secciones = await import("../lib/secciones");
    const roles = await import("../lib/roles");
    (sesion.obtenerSesion as any).mockResolvedValue(jefe);
    (secciones.esJefatura as any).mockReturnValue(true);
    (roles.rolPorClave as any).mockReturnValue({ clave: "Comandancia" });

    const { cambiarUsername } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("username", "actual");
    fd.set("grupo", "Comandancia");
    fd.set("nuevo_username", "ab"); // Muy corto
    fd.set("nueva_password", "NuevaClave1");
    const r = await cambiarUsername({} as any, fd);
    expect(r.estado).toBe("error");
    expect(r.campo).toBe("nuevo_username-actual");
  });

  it("rechaza si el username está vacío (requiere cambio de usuario o contraseña)", async () => {
    const sesion = await import("../lib/sesion");
    const secciones = await import("../lib/secciones");
    const roles = await import("../lib/roles");
    (sesion.obtenerSesion as any).mockResolvedValue(jefe);
    (secciones.esJefatura as any).mockReturnValue(true);
    (roles.rolPorClave as any).mockReturnValue({ clave: "Comandancia" });

    const { cambiarUsername } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("username", "actual");
    fd.set("grupo", "Comandancia");
    fd.set("nuevo_username", ""); // Vacío
    fd.set("nueva_password", "NuevaClave1");
    const r = await cambiarUsername({} as any, fd);
    expect(r.estado).toBe("error");
    expect(r.campo).toBe("nuevo_username-actual");
  });

  it("rechaza si la contraseña no cumple la política", async () => {
    const sesion = await import("../lib/sesion");
    const secciones = await import("../lib/secciones");
    const roles = await import("../lib/roles");
    const api = await import("../lib/cuentas-api");
    (sesion.obtenerSesion as any).mockResolvedValue(jefe);
    (secciones.esJefatura as any).mockReturnValue(true);
    (roles.rolPorClave as any).mockReturnValue({ clave: "Comandancia" });
    (api.validarPolitica as any).mockReturnValue("Falta número");

    const { cambiarUsername } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("username", "actual");
    fd.set("grupo", "Comandancia");
    fd.set("nuevo_username", "nuevo");
    fd.set("nueva_password", "SinNumero");
    const r = await cambiarUsername({} as any, fd);
    expect(r.estado).toBe("error");
    expect(r.campo).toBe("nueva_password-actual");
  });

  it("propaga error de cambiarUsernameCuenta", async () => {
    const sesion = await import("../lib/sesion");
    const secciones = await import("../lib/secciones");
    const roles = await import("../lib/roles");
    const api = await import("../lib/cuentas-api");
    (sesion.obtenerSesion as any).mockResolvedValue(jefe);
    (secciones.esJefatura as any).mockReturnValue(true);
    (roles.rolPorClave as any).mockReturnValue({ clave: "Comandancia" });
    (api.validarPolitica as any).mockReturnValue(null);
    (api.cambiarUsernameCuenta as any).mockResolvedValue({ ok: false, motivo: "boom" });

    const { cambiarUsername } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("username", "actual");
    fd.set("grupo", "Comandancia");
    fd.set("nuevo_username", "nuevo");
    fd.set("nueva_password", "NuevaClave1");
    const r = await cambiarUsername({} as any, fd);
    expect(r.estado).toBe("error");
    expect(r.mensaje).toBe("boom");
  });

  it("éxito: cambia el username y devuelve mensaje", async () => {
    const sesion = await import("../lib/sesion");
    const secciones = await import("../lib/secciones");
    const roles = await import("../lib/roles");
    const api = await import("../lib/cuentas-api");
    (sesion.obtenerSesion as any).mockResolvedValue(jefe);
    (secciones.esJefatura as any).mockReturnValue(true);
    (roles.rolPorClave as any).mockReturnValue({ clave: "Comandancia" });
    (api.validarPolitica as any).mockReturnValue(null);
    (api.cambiarUsernameCuenta as any).mockResolvedValue({ 
      ok: true, 
      datos: { mensaje: "Usuario cambiado" } 
    });

    const { cambiarUsername } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("username", "actual");
    fd.set("grupo", "Comandancia");
    fd.set("nuevo_username", "nuevo");
    fd.set("nueva_password", "NuevaClave1");
    const r = await cambiarUsername({} as any, fd);
    
    expect(r.estado).toBe("ok");
    expect(r.mensaje).toBe("Usuario cambiado");
    expect(api.cambiarUsernameCuenta).toHaveBeenCalledWith("actual", "nuevo", "NuevaClave1");
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
    (api.cambiarUsernameCuenta as any).mockResolvedValue({ 
      ok: true, 
      datos: { mensaje: "" } 
    });

    const { cambiarUsername } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("username", "actual");
    fd.set("grupo", "Comandancia");
    fd.set("nuevo_username", "nuevo");
    fd.set("nueva_password", "NuevaClave1");
    const r = await cambiarUsername({} as any, fd);
    
    expect(r.estado).toBe("ok");
    expect(r.mensaje).toMatch(/nuevo/);
  });
});