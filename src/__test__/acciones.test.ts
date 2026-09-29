import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ACCIONES = "../app/panel/bandeja-documental/acciones";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));
vi.mock("../lib/sesion", () => ({ obtenerSesion: vi.fn() }));
vi.mock("../lib/documentos-repo");
vi.mock("../lib/permisos-documentos");
vi.mock("../lib/secciones", () => ({
  seccionPorClave: vi.fn(),
  SECCIONES: [],
}));
vi.mock("../lib/permisos-documentos", () => ({
  puedeRegistrar: vi.fn(),
  puedeEliminar: vi.fn(),
  puedeGestionarDocumento: vi.fn(),
  seccionesParaRegistrar: vi.fn(),
}));

vi.mock("../lib/documentos-repo", () => ({
  registrarDocumento: vi.fn(),
  obtenerDocumento: vi.fn(),
  derivarDocumento: vi.fn(),
  cambiarEstado: vi.fn(),
  registrarEnvioExterno: vi.fn(),
  actualizarAdjunto: vi.fn(),
  eliminarDocumento: vi.fn(),
}));

const bombero = { sub: "u1", nombre: "Ana", grado: "Teniente CBP", seccion: "administracion" } as any;

describe("acciones de bandeja documental", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const sesion = await import("../lib/sesion");
    (sesion.obtenerSesion as any).mockResolvedValue(bombero);
  });

  afterEach(() => vi.restoreAllMocks());

  it("registrar devuelve error si no puede registrar", async () => {
    const permisos = await import("../lib/permisos-documentos");
    (permisos.puedeRegistrar as any).mockReturnValue(false);
    const { registrar } = await import(ACCIONES);
    const r = await registrar({ estado: "inicial" } as any, new FormData());
    expect(r.estado).toBe("error");
  });

  it("registrar valida tipo inválido", async () => {
    const permisos = await import("../lib/permisos-documentos");
    (permisos.puedeRegistrar as any).mockReturnValue(true);
    const { registrar } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("tipo", "Inexistente");
    const r = await registrar({} as any, fd);
    expect(r.campo).toBe("tipo");
  });

  it("registrar valida número", async () => {
    const permisos = await import("../lib/permisos-documentos");
    (permisos.puedeRegistrar as any).mockReturnValue(true);
    const { registrar } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("tipo", "Oficio");
    fd.set("numero", "abc");
    const r = await registrar({} as any, fd);
    expect(r.campo).toBe("numero");
  });

  it("registrar redirige al detalle si todo es válido", async () => {
    const permisos = await import("../lib/permisos-documentos");
    const repo = await import("../lib/documentos-repo");
    const secciones = await import("../lib/secciones");
    (permisos.puedeRegistrar as any).mockReturnValue(true);
    (permisos.seccionesParaRegistrar as any).mockReturnValue(["administracion"]);
    (secciones.seccionPorClave as any).mockReturnValue({ nombre: "Administración" });
    (repo.registrarDocumento as any).mockResolvedValue({ id: "001-2026" });

    const { registrar } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("tipo", "Oficio");
    fd.set("numero", "1");
    fd.set("asunto", "Un asunto suficientemente largo");
    fd.set("origen", "Comandancia");
    fd.set("destino", "Administración");
    fd.set("seccion", "administracion");
    fd.set("folios", "2");
    fd.set("plazo", "2026-12-30");

    await expect(registrar({} as any, fd)).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("eliminarArchivado rechaza si no puede eliminar", async () => {
    const permisos = await import("../lib/permisos-documentos");
    const repo = await import("../lib/documentos-repo");
    (repo.obtenerDocumento as any).mockResolvedValue({ id: "x", estado: "Pendiente" });
    (permisos.puedeEliminar as any).mockReturnValue(false);

    const { eliminarArchivado } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("id", "x");
    const r = await eliminarArchivado({} as any, fd);
    expect(r.estado).toBe("error");
  });

  it("eliminarArchivado exige confirmación", async () => {
    const permisos = await import("../lib/permisos-documentos");
    const repo = await import("../lib/documentos-repo");
    (repo.obtenerDocumento as any).mockResolvedValue({ id: "x", estado: "Archivado" });
    (permisos.puedeEliminar as any).mockReturnValue(true);

    const { eliminarArchivado } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("id", "x");
    const r = await eliminarArchivado({} as any, fd);
    expect(r.campo).toBe("confirmacion");
  });

  it("derivar rechaza si el documento está en la misma sección", async () => {
    const permisos = await import("../lib/permisos-documentos");
    const repo = await import("../lib/documentos-repo");
    const secciones = await import("../lib/secciones");
    (repo.obtenerDocumento as any).mockResolvedValue({ id: "x", seccion: "maquinas" });
    (permisos.puedeGestionarDocumento as any).mockReturnValue(true);
    (secciones.seccionPorClave as any).mockReturnValue({ nombre: "Máquinas" });

    const { derivar } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("id", "x");
    fd.set("seccion", "maquinas");
    const r = await derivar({} as any, fd);
    expect(r.estado).toBe("error");
  });

  it("cambiarEstado rechaza estado igual", async () => {
    const permisos = await import("../lib/permisos-documentos");
    const repo = await import("../lib/documentos-repo");
    (repo.obtenerDocumento as any).mockResolvedValue({ id: "x", estado: "Pendiente" });
    (permisos.puedeGestionarDocumento as any).mockReturnValue(true);

    const { cambiarEstadoDocumento } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("id", "x");
    fd.set("estado", "Pendiente");
    const r = await cambiarEstadoDocumento({} as any, fd);
    expect(r.estado).toBe("error");
  });

  it("adjuntar exige archivo", async () => {
    const permisos = await import("../lib/permisos-documentos");
    const repo = await import("../lib/documentos-repo");
    (repo.obtenerDocumento as any).mockResolvedValue({ id: "x" });
    (permisos.puedeGestionarDocumento as any).mockReturnValue(true);

    const { adjuntar } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("id", "x");
    const r = await adjuntar({} as any, fd);
    expect(r.campo).toBe("archivo");
  });
});