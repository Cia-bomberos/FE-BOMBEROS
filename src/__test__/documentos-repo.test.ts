import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const REPO = "../lib/documentos-repo";

// Bombero de prueba reutilizable
const actor = {
  sub: "u-1",
  nombre: "Ana",
  grado: "Teniente CBP",
  seccion: "administracion",
} as any;

describe("documentos-repo", () => {
  beforeEach(() => {
    vi.resetModules();
    // Cada test parte de un almacén limpio
    delete (globalThis as any).__f3Documentos;
  });

  afterEach(() => {
    delete (globalThis as any).__f3Documentos;
    vi.restoreAllMocks();
  });

  describe("prioridadPorPlazo (RN-0013)", () => {
    it("devuelve Alta si faltan menos de 10 días", async () => {
      const { prioridadPorPlazo } = await import(REPO);
      const hoy = new Date(2026, 0, 1);
      // plazo 5 días después
      expect(prioridadPorPlazo("06/01/2026", hoy)).toBe("Alta");
    });

    it("devuelve Media si faltan entre 10 y 30 días", async () => {
      const { prioridadPorPlazo } = await import(REPO);
      const hoy = new Date(2026, 0, 1);
      expect(prioridadPorPlazo("20/01/2026", hoy)).toBe("Media");
    });

    it("devuelve Baja si faltan más de 30 días", async () => {
      const { prioridadPorPlazo } = await import(REPO);
      const hoy = new Date(2026, 0, 1);
      expect(prioridadPorPlazo("15/03/2026", hoy)).toBe("Baja");
    });

    it("devuelve Alta si el plazo es inválido", async () => {
      const { prioridadPorPlazo } = await import(REPO);
      expect(prioridadPorPlazo("no-es-fecha", new Date())).toBe("Alta");
    });
  });

  describe("listarDocumentos y obtenerDocumento", () => {
    it("lista los documentos sembrados", async () => {
      const { listarDocumentos } = await import(REPO);
      const docs = await listarDocumentos();
      expect(Array.isArray(docs)).toBe(true);
      expect(docs.length).toBeGreaterThan(0);
    });

    it("devuelve copias (no referencias mutables)", async () => {
      const { listarDocumentos } = await import(REPO);
      const a = await listarDocumentos();
      const b = await listarDocumentos();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });

    it("obtenerDocumento devuelve null si no existe", async () => {
      const { obtenerDocumento } = await import(REPO);
      expect(await obtenerDocumento("no-existe")).toBeNull();
    });

    it("obtenerDocumento devuelve el documento existente", async () => {
      const { listarDocumentos, obtenerDocumento } = await import(REPO);
      const [primero] = await listarDocumentos();
      const doc = await obtenerDocumento(primero.id);
      expect(doc?.id).toBe(primero.id);
    });
  });

  describe("registrarDocumento", () => {
    const base = {
      tipo: "Oficio" as const,
      numero: "999",
      asunto: "Solicitud de prueba de materiales",
      origen: "Comandancia",
      destino: "Administración",
      seccion: "administracion" as const,
      via: "Digital" as const,
      folios: 3,
      plazo: "30/12/2026",
    };

    it("registra un documento y lo deja Pendiente (RN-0007)", async () => {
      const { registrarDocumento } = await import(REPO);
      const doc = await registrarDocumento(base, actor);
      expect(doc.estado).toBe("Pendiente");
      expect(doc.trazabilidad).toHaveLength(2);
      expect(doc.trazabilidad[0].etapa).toBe("Ingreso");
      expect(doc.trazabilidad[1].etapa).toBe("Clasificación");
    });

    it("usa la prioridad manual si viene", async () => {
      const { registrarDocumento } = await import(REPO);
      const doc = await registrarDocumento({ ...base, numero: "998", prioridad: "Baja" }, actor);
      expect(doc.prioridad).toBe("Baja");
      expect(doc.prioridadManual).toBe(true);
    });

    it("lanza error si el número ya existe", async () => {
      const { registrarDocumento } = await import(REPO);
      await registrarDocumento(base, actor);
      await expect(
        registrarDocumento({ ...base, asunto: "Otro asunto distinto" }, actor),
      ).rejects.toThrow(/Ya existe/);
    });

    it("adjunta archivo si se provee", async () => {
      const { registrarDocumento } = await import(REPO);
      const doc = await registrarDocumento(
        { ...base, numero: "997", adjunto: { nombre: "a.pdf", tamano: "1 KB", actualizado: "01/01/2026" } },
        actor,
      );
      expect(doc.adjunto?.nombre).toBe("a.pdf");
    });
  });

  describe("derivarDocumento", () => {
    it("cambia la sección y pasa a En proceso", async () => {
      const { listarDocumentos, derivarDocumento } = await import(REPO);
      const [doc] = await listarDocumentos();
      const actualizado = await derivarDocumento(doc.id, "maquinas", "nota", actor);
      expect(actualizado.seccion).toBe("maquinas");
      expect(actualizado.estado).toBe("En proceso");
      expect(actualizado.trazabilidad.at(-1)?.etapa).toBe("Derivación");
    });

    it("no cambia el estado si ya no está Pendiente", async () => {
      const { listarDocumentos, cambiarEstado, derivarDocumento } = await import(REPO);
      const [doc] = await listarDocumentos();
      await cambiarEstado(doc.id, "Atendido", "", actor);
      const derivado = await derivarDocumento(doc.id, "maquinas", "", actor);
      expect(derivado.estado).toBe("Atendido");
    });

    it("lanza si el documento no existe", async () => {
      const { derivarDocumento } = await import(REPO);
      await expect(derivarDocumento("x", "maquinas", "", actor)).rejects.toThrow(
        "Documento no encontrado.",
      );
    });
  });

  describe("cambiarEstado", () => {
    it("registra la transición con la etapa correcta", async () => {
      const { listarDocumentos, cambiarEstado } = await import(REPO);
      const [doc] = await listarDocumentos();
      const r = await cambiarEstado(doc.id, "Archivado", "", actor);
      expect(r.estado).toBe("Archivado");
      expect(r.trazabilidad.at(-1)?.etapa).toBe("Archivo");
    });

    it("usa 'Cambio de estado' para estados distintos de Archivado", async () => {
      const { listarDocumentos, cambiarEstado } = await import(REPO);
      const [doc] = await listarDocumentos();
      const r = await cambiarEstado(doc.id, "En proceso", "", actor);
      expect(r.trazabilidad.at(-1)?.etapa).toBe("Cambio de estado");
    });
  });

  describe("registrarEnvioExterno (RN-0021, RN-0022)", () => {
    it("cierra la gestión como Atendido y guarda el envío", async () => {
      const { listarDocumentos, registrarEnvioExterno } = await import(REPO);
      const [doc] = await listarDocumentos();
      const r = await registrarEnvioExterno(doc.id, "Correo", "Municipalidad", actor);
      expect(r.estado).toBe("Atendido");
      expect(r.envioExterno).toMatchObject({ medio: "Correo", destinatario: "Municipalidad" });
    });
  });

  describe("actualizarAdjunto", () => {

  it("agrega adjunto si no existía", async () => {
    const { registrarDocumento, actualizarAdjunto } = await import(REPO);

    // Registramos uno fresco, sin adjunto
    const doc = await registrarDocumento(
      {
        tipo: "Oficio",
        numero: "777",
        asunto: "Documento sin adjunto inicial",
        origen: "X",
        destino: "Y",
        seccion: "administracion",
        via: "Digital",
        folios: 1,
        plazo: "30/12/2026",
      },
      actor,
    );
    expect(doc.adjunto).toBeUndefined();

    const r = await actualizarAdjunto(
      doc.id,
      { nombre: "nuevo.pdf", tamano: "2 KB", actualizado: "01/01/2026" },
      actor,
    );
    expect(r.trazabilidad.at(-1)?.detalle).toMatch(/Adjunto agregado/);
    });
  });

  describe("eliminarDocumento (RN-0028)", () => {
    it("elimina el documento del almacén", async () => {
      const { listarDocumentos, eliminarDocumento } = await import(REPO);
      const [doc] = await listarDocumentos();
      await eliminarDocumento(doc.id);
      expect(await listarDocumentos()).not.toContainEqual(
        expect.objectContaining({ id: doc.id }),
      );
    });

    it("lanza error si no existe", async () => {
      const { eliminarDocumento } = await import(REPO);
      await expect(eliminarDocumento("nope")).rejects.toThrow("Documento no encontrado.");
    });
  });
});