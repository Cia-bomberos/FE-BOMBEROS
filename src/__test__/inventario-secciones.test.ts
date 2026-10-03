// src/__test__/inventario-acciones.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));
vi.mock("../lib/sesion", () => ({ obtenerSesion: vi.fn() }));
vi.mock("../lib/inventario-repo", () => ({
  CATEGORIAS_ACTIVO: ["Extintores", "EPP", "Materiales"],
  ESTADOS_ACTIVO: ["Operativo", "En reparación", "De baja"],
  puedeRegistrarActivo: vi.fn(),
  registrarActivo: vi.fn(),
  seccionesInventarioDe: vi.fn(),
}));

const ACCIONES = "../app/panel/inventario/acciones";

const bombero = {
  sub: "u1",
  nombre: "Ana",
  seccion: "servicio-general",
  grupos: [],
} as any;

function formDataValido(): FormData {
  const fd = new FormData();
  fd.set("descripcion", "Extintor PQS");
  fd.set("categoria", "Extintores");
  fd.set("cantidad", "2");
  fd.set("ubicacion", "Depósito A");
  fd.set("estado", "Operativo");
  fd.set("seccion", "servicio-general");
  return fd;
}

describe("inventario/acciones - registrar", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const sesion = await import("../lib/sesion");
    (sesion.obtenerSesion as any).mockResolvedValue(bombero);
    const repo = await import("../lib/inventario-repo");
    (repo.puedeRegistrarActivo as any).mockReturnValue(true);
    (repo.seccionesInventarioDe as any).mockReturnValue(["servicio-general"]);
  });

  it("redirige a login si no hay sesión", async () => {
    const sesion = await import("../lib/sesion");
    (sesion.obtenerSesion as any).mockResolvedValue(null);
    const { registrar } = await import(ACCIONES);
    await expect(
      registrar({} as any, new FormData()),
    ).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("rechaza si no puede registrar", async () => {
    const repo = await import("../lib/inventario-repo");
    (repo.puedeRegistrarActivo as any).mockReturnValue(false);
    const { registrar } = await import(ACCIONES);
    const r = await registrar({} as any, new FormData());
    expect(r.estado).toBe("error");
    expect(r.mensaje).toMatch(/sección con inventario/);
  });

  it("valida descripción", async () => {
    const { registrar } = await import(ACCIONES);
    const fd = formDataValido();
    fd.set("descripcion", "ab");
    const r = await registrar({} as any, fd);
    expect(r.campo).toBe("descripcion");
  });

  it("valida categoría", async () => {
    const { registrar } = await import(ACCIONES);
    const fd = formDataValido();
    fd.set("categoria", "NoExiste");
    const r = await registrar({} as any, fd);
    expect(r.campo).toBe("categoria");
  });

  it("valida cantidad entera positiva", async () => {
    const { registrar } = await import(ACCIONES);
    const fd1 = formDataValido();
    fd1.set("cantidad", "0");
    expect((await registrar({} as any, fd1)).campo).toBe("cantidad");

    const fd2 = formDataValido();
    fd2.set("cantidad", "1.5");
    expect((await registrar({} as any, fd2)).campo).toBe("cantidad");
  });

  it.each([
    ["ubicacion", ""],
    ["estado", "Inexistente"],
    ["seccion", "maquinas"],
  ])("valida %s", async (campo: string, valor: string) => {
    const { registrar } = await import(ACCIONES);
    const fd = formDataValido();
    fd.set(campo, valor);
    expect((await registrar({} as any, fd)).campo).toBe(campo);
  });

  it("llama a registrarActivo y redirige al éxito", async () => {
    const repo = await import("../lib/inventario-repo");
    (repo.registrarActivo as any).mockResolvedValue({ codigo: "EXT-001" });
    const { registrar } = await import(ACCIONES);
    await expect(
      registrar({} as any, formDataValido()),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(repo.registrarActivo).toHaveBeenCalled();
  });

  it("pasa observaciones undefined si vienen vacías", async () => {
    const repo = await import("../lib/inventario-repo");
    (repo.registrarActivo as any).mockResolvedValue({ codigo: "X" });
    const { registrar } = await import(ACCIONES);
    const fd = formDataValido();
    fd.set("observaciones", "   ");
    await expect(registrar({} as any, fd)).rejects.toThrow(/NEXT_REDIRECT/);

    const [, datos] = (repo.registrarActivo as any).mock.calls[0];
    const body = (repo.registrarActivo as any).mock.calls[0][0];
    expect(body.observaciones).toBeUndefined();
  });
});