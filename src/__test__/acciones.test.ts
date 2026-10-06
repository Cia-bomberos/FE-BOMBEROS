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
  SECCIONES_BANDEJA: ["administracion", "servicio-general", "maquinas", "sanidad"],
}));

vi.mock("../lib/documentos-repo", () => {
  class ErrorBandeja extends Error {
    constructor(mensaje: string, readonly estado: number) {
      super(mensaje);
    }
  }
  return {
    ErrorBandeja,
    registrarDocumento: vi.fn(),
    obtenerDocumento: vi.fn(),
    derivarDocumento: vi.fn(),
    marcarAtendido: vi.fn(),
    asignarPrioridad: vi.fn(),
    registrarEnvioExterno: vi.fn(),
    actualizarAdjunto: vi.fn(),
    eliminarDocumento: vi.fn(),
  };
});

const pdf = (contenido = "%PDF-1.7 contenido", nombre = "oficio.pdf") =>
  new File([contenido], nombre, { type: "application/pdf" });

/** Formulario de registro válido; cada prueba rompe solo lo que verifica. */
function formularioRegistro(cambios: Record<string, string | File | null> = {}) {
  const valores: Record<string, string | File | null> = {
    procedencia: "interno",
    tipo: "Oficio",
    asunto: "Un asunto suficientemente largo",
    via: "Digital",
    plazo: "2026-12-30",
    archivo: pdf(),
    ...cambios,
  };
  const fd = new FormData();
  for (const [clave, valor] of Object.entries(valores)) {
    if (valor !== null) fd.set(clave, valor);
  }
  return fd;
}

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

  it("registrar valida la procedencia", async () => {
    const permisos = await import("../lib/permisos-documentos");
    (permisos.puedeRegistrar as any).mockReturnValue(true);
    const { registrar } = await import(ACCIONES);
    const r = await registrar({} as any, formularioRegistro({ procedencia: "otro" }));
    expect(r.campo).toBe("procedencia");
  });

  it("registrar exige tipo válido en internos", async () => {
    const permisos = await import("../lib/permisos-documentos");
    (permisos.puedeRegistrar as any).mockReturnValue(true);
    const { registrar } = await import(ACCIONES);
    const r = await registrar({} as any, formularioRegistro({ tipo: "Inexistente" }));
    expect(r.campo).toBe("tipo");
  });

  it("registrar exige el PDF", async () => {
    const permisos = await import("../lib/permisos-documentos");
    (permisos.puedeRegistrar as any).mockReturnValue(true);
    const { registrar } = await import(ACCIONES);
    const r = await registrar({} as any, formularioRegistro({ archivo: null }));
    expect(r.campo).toBe("archivo");
  });

  it("registrar rechaza un archivo que no es PDF por su contenido (RNF-0007)", async () => {
    const permisos = await import("../lib/permisos-documentos");
    (permisos.puedeRegistrar as any).mockReturnValue(true);
    const { registrar } = await import(ACCIONES);
    const r = await registrar(
      {} as any,
      formularioRegistro({ archivo: pdf("no soy un pdf", "falso.pdf") }),
    );
    expect(r).toMatchObject({ campo: "archivo", mensaje: "El archivo no es un PDF válido." });
  });

  it("registrar envía un externo sin tipo y redirige al detalle", async () => {
    const permisos = await import("../lib/permisos-documentos");
    const repo = await import("../lib/documentos-repo");
    (permisos.puedeRegistrar as any).mockReturnValue(true);
    (repo.registrarDocumento as any).mockResolvedValue("uuid-1");

    const { registrar } = await import(ACCIONES);
    await expect(
      registrar({} as any, formularioRegistro({ procedencia: "externo", tipo: "" })),
    ).rejects.toMatchObject({ url: "/panel/bandeja-documental/documentos/uuid-1" });

    expect(repo.registrarDocumento).toHaveBeenCalledWith(
      expect.objectContaining({ procedencia: "externo", tipo: undefined, plazo: "30/12/2026" }),
    );
  });

  it("registrar muestra el rechazo del backend", async () => {
    const permisos = await import("../lib/permisos-documentos");
    const repo = await import("../lib/documentos-repo");
    (permisos.puedeRegistrar as any).mockReturnValue(true);
    (repo.registrarDocumento as any).mockRejectedValue(
      new repo.ErrorBandeja("Rol no autorizado para registrar documentos.", 403),
    );

    const { registrar } = await import(ACCIONES);
    const r = await registrar({} as any, formularioRegistro());
    expect(r).toEqual({ estado: "error", mensaje: "Rol no autorizado para registrar documentos." });
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

  it("derivar llama al backend con la sección destino", async () => {
    const permisos = await import("../lib/permisos-documentos");
    const repo = await import("../lib/documentos-repo");
    const secciones = await import("../lib/secciones");
    (repo.obtenerDocumento as any).mockResolvedValue({ id: "x", seccion: "maquinas" });
    (permisos.puedeGestionarDocumento as any).mockReturnValue(true);
    (secciones.seccionPorClave as any).mockReturnValue({ nombre: "Sanidad" });

    const { derivar } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("id", "x");
    fd.set("seccion", "sanidad");
    fd.set("nota", "Revisar");
    const r = await derivar({} as any, fd);
    expect(r).toEqual({ estado: "ok", mensaje: "Derivado a Sanidad." });
    expect(repo.derivarDocumento).toHaveBeenCalledWith("x", "sanidad", "Revisar");
  });

  it("cambiarEstado solo admite pasar a Atendido", async () => {
    const permisos = await import("../lib/permisos-documentos");
    const repo = await import("../lib/documentos-repo");
    (repo.obtenerDocumento as any).mockResolvedValue({ id: "x", estado: "Pendiente" });
    (permisos.puedeGestionarDocumento as any).mockReturnValue(true);

    const { cambiarEstadoDocumento } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("id", "x");
    fd.set("estado", "Archivado");
    const r = await cambiarEstadoDocumento({} as any, fd);
    expect(r.campo).toBe("estado");
    expect(repo.marcarAtendido).not.toHaveBeenCalled();
  });

  it("cambiarEstado rechaza un documento ya Atendido", async () => {
    const permisos = await import("../lib/permisos-documentos");
    const repo = await import("../lib/documentos-repo");
    (repo.obtenerDocumento as any).mockResolvedValue({ id: "x", estado: "Atendido" });
    (permisos.puedeGestionarDocumento as any).mockReturnValue(true);

    const { cambiarEstadoDocumento } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("id", "x");
    fd.set("estado", "Atendido");
    const r = await cambiarEstadoDocumento({} as any, fd);
    expect(r.estado).toBe("error");
  });

  it("cambiarEstado marca Atendido un documento En proceso", async () => {
    const permisos = await import("../lib/permisos-documentos");
    const repo = await import("../lib/documentos-repo");
    (repo.obtenerDocumento as any).mockResolvedValue({ id: "x", estado: "En proceso" });
    (permisos.puedeGestionarDocumento as any).mockReturnValue(true);

    const { cambiarEstadoDocumento } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("id", "x");
    fd.set("estado", "Atendido");
    const r = await cambiarEstadoDocumento({} as any, fd);
    expect(r.estado).toBe("ok");
    expect(repo.marcarAtendido).toHaveBeenCalledWith("x", "");
  });

  it("ajustarPrioridad exige prioridad o plazo", async () => {
    const permisos = await import("../lib/permisos-documentos");
    const repo = await import("../lib/documentos-repo");
    (repo.obtenerDocumento as any).mockResolvedValue({ id: "x", estado: "Pendiente" });
    (permisos.puedeGestionarDocumento as any).mockReturnValue(true);

    const { ajustarPrioridad } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("id", "x");
    const r = await ajustarPrioridad({} as any, fd);
    expect(r.estado).toBe("error");
  });

  it("ajustarPrioridad envía prioridad y plazo", async () => {
    const permisos = await import("../lib/permisos-documentos");
    const repo = await import("../lib/documentos-repo");
    (repo.obtenerDocumento as any).mockResolvedValue({ id: "x", estado: "Pendiente" });
    (permisos.puedeGestionarDocumento as any).mockReturnValue(true);

    const { ajustarPrioridad } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("id", "x");
    fd.set("prioridad", "Baja");
    fd.set("plazo", "2026-11-15");
    const r = await ajustarPrioridad({} as any, fd);
    expect(r.estado).toBe("ok");
    expect(repo.asignarPrioridad).toHaveBeenCalledWith("x", { prioridad: "Baja", plazo: "15/11/2026" });
  });

  it("adjuntar solo con el documento En proceso (RN-0010)", async () => {
    const permisos = await import("../lib/permisos-documentos");
    const repo = await import("../lib/documentos-repo");
    (repo.obtenerDocumento as any).mockResolvedValue({ id: "x", estado: "Pendiente" });
    (permisos.puedeGestionarDocumento as any).mockReturnValue(true);

    const { adjuntar } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("id", "x");
    fd.set("archivo", pdf());
    const r = await adjuntar({} as any, fd);
    expect(r.estado).toBe("error");
    expect(repo.actualizarAdjunto).not.toHaveBeenCalled();
  });

  it("eliminarArchivado muestra el rechazo del backend (Drive sin confirmar)", async () => {
    const permisos = await import("../lib/permisos-documentos");
    const repo = await import("../lib/documentos-repo");
    (repo.obtenerDocumento as any).mockResolvedValue({ id: "x", estado: "Archivado" });
    (permisos.puedeEliminar as any).mockReturnValue(true);
    (repo.eliminarDocumento as any).mockRejectedValue(
      new repo.ErrorBandeja("No se puede eliminar: todavía no se confirmó la subida a Google Drive.", 409),
    );

    const { eliminarArchivado } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("id", "x");
    fd.set("confirmacion", "on");
    const r = await eliminarArchivado({} as any, fd);
    expect(r.mensaje).toMatch(/Google Drive/);
  });

  it("adjuntar exige archivo", async () => {
    const permisos = await import("../lib/permisos-documentos");
    const repo = await import("../lib/documentos-repo");
    (repo.obtenerDocumento as any).mockResolvedValue({ id: "x", estado: "En proceso" });
    (permisos.puedeGestionarDocumento as any).mockReturnValue(true);

    const { adjuntar } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("id", "x");
    const r = await adjuntar({} as any, fd);
    expect(r.campo).toBe("archivo");
  });
});