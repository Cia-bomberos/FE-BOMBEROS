import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const REPO = "../lib/documentos-repo";

vi.mock("../lib/api", () => ({ apiFetch: vi.fn() }));

const ID = "3f2b8c1e-5a4d-4e6f-9b0a-1c2d3e4f5a6b";

/** Documento tal como lo devuelve MS-BANDEJA-BOMBEROS. */
const documentoApi = (extra: Record<string, unknown> = {}) => ({
  id: ID,
  codigo_unico: "OFICIO N° 007-2026/CGBVP/IVCDLC/B3",
  tipo: "Oficio",
  modalidad: "completo",
  estado: "Pendiente",
  prioridad: "Media",
  prioridad_manual: false,
  seccion_origen: "Administracion",
  seccion_responsable: "ServicioGeneral",
  fecha_limite: "2026-10-20",
  archivo_s3_key: "documentos/abc.pdf",
  confirmado_drive: false,
  atendido_en: null,
  // Python serializa así los TIMESTAMPTZ (json.dumps default=str).
  fecha_creacion: "2026-10-04 15:22:10.123456+00:00",
  fecha_actualizacion: "2026-10-04 15:22:10.123456+00:00",
  vencido: false,
  ...extra,
});

const ok = (datos: unknown) => ({ ok: true, datos });
const falla = (estado: number, motivo = "x") => ({ ok: false, estado, motivo });

async function cargar() {
  const repo = await import(REPO);
  const { apiFetch } = await import("../lib/api");
  return { repo, apiFetch: vi.mocked(apiFetch) };
}

describe("documentos-repo", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("prioridadPorPlazo (RN-0013)", () => {
    it.each([
      ["06/01/2026", "Alta"],
      ["20/01/2026", "Media"],
      ["15/03/2026", "Baja"],
    ])("devuelve %s según el plazo %s", async (plazo, prioridad) => {
      const { prioridadPorPlazo } = await import(REPO);
      const hoy = new Date(2026, 0, 1);
      expect(prioridadPorPlazo(plazo, hoy)).toBe(prioridad);
    });

    it("devuelve Alta si el plazo es inválido", async () => {
      const { prioridadPorPlazo } = await import(REPO);
      expect(prioridadPorPlazo("no-es-fecha", new Date())).toBe("Alta");
    });
  });

  describe("listarDocumentos", () => {
    it("pide GET /documentos al gateway de la bandeja", async () => {
      const { repo, apiFetch } = await cargar();
      apiFetch.mockResolvedValue(ok({ documentos: [] }) as any);
      await repo.listarDocumentos();
      expect(apiFetch).toHaveBeenCalledWith("/documentos", { servicio: "bandeja" });
    });

    it("traduce el contrato del backend al modelo del panel", async () => {
      const { repo, apiFetch } = await cargar();
      apiFetch.mockResolvedValue(ok({ documentos: [documentoApi()] }) as any);

      const [doc] = await repo.listarDocumentos();
      expect(doc).toMatchObject({
        id: ID,
        numero: "OFICIO N° 007-2026/CGBVP/IVCDLC/B3",
        tipo: "Oficio",
        modalidad: "completo",
        seccion: "servicio-general",
        origen: "Administración",
        destino: "Servicio General",
        // 15:22 UTC son las 10:22 en Lima.
        fechaIngreso: "04/10/2026",
        plazo: "20/10/2026",
        estado: "Pendiente",
        prioridad: "Media",
        prioridadManual: false,
        adjunto: { nombre: "Documento PDF", tamano: "PDF", actualizado: "04/10/2026" },
        trazabilidad: [],
      });
    });

    it("un externo no tiene código ni tipo (RN-0025)", async () => {
      const { repo, apiFetch } = await cargar();
      apiFetch.mockResolvedValue(
        ok({ documentos: [documentoApi({ modalidad: "simplificado", codigo_unico: null, tipo: null })] }) as any,
      );

      const [doc] = await repo.listarDocumentos();
      expect(doc.numero).toBe("Externo 3F2B8C1E");
      expect(doc.tipo).toBe("Externo");
      expect(doc.origen).toBe("Entidad externa");
    });

    it("lanza ErrorBandeja con el mensaje del backend si falla", async () => {
      const { repo, apiFetch } = await cargar();
      apiFetch.mockResolvedValue(falla(403, "Rol no autorizado.") as any);
      await expect(repo.listarDocumentos()).rejects.toMatchObject({
        name: "ErrorBandeja",
        message: "Rol no autorizado.",
        estado: 403,
      });
    });

    it("no expone el detalle interno de un 500", async () => {
      const { repo, apiFetch } = await cargar();
      apiFetch.mockResolvedValue(falla(500, 'relation "documentos" does not exist') as any);
      await expect(repo.listarDocumentos()).rejects.toThrow(/no pudo completar la operación/);
    });

    it("listarDocumentosSiDisponible devuelve [] si la bandeja no responde", async () => {
      const { repo, apiFetch } = await cargar();
      apiFetch.mockResolvedValue(falla(503) as any);
      await expect(repo.listarDocumentosSiDisponible()).resolves.toEqual([]);
    });
  });

  describe("obtenerDocumento", () => {
    it("no llama al backend con un id que no es UUID", async () => {
      const { repo, apiFetch } = await cargar();
      await expect(repo.obtenerDocumento("001-2026")).resolves.toBeNull();
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it.each([404, 403])("devuelve null ante %s (RN-0004)", async (estado) => {
      const { repo, apiFetch } = await cargar();
      apiFetch.mockResolvedValue(falla(estado) as any);
      await expect(repo.obtenerDocumento(ID)).resolves.toBeNull();
    });

    it("lanza ante otros errores", async () => {
      const { repo, apiFetch } = await cargar();
      apiFetch.mockResolvedValue(falla(502) as any);
      await expect(repo.obtenerDocumento(ID)).rejects.toThrow();
    });

    it("convierte el historial en trazabilidad y detecta el envío externo", async () => {
      const { repo, apiFetch } = await cargar();
      apiFetch.mockResolvedValue(
        ok(
          documentoApi({
            estado: "Atendido",
            historial: [
              {
                accion: "registro",
                detalle: "Documento registrado (completo).",
                usuario_nombre: "Ana Torres",
                seccion: "Administracion",
                fecha_hora: "2026-10-04 15:22:10.5+00:00",
              },
              {
                accion: "envio_externo",
                detalle: "Envío externo registrado; documento Atendido.",
                usuario_nombre: null,
                seccion: "ServicioGeneral",
                fecha_hora: "2026-10-05 01:05:00+00:00",
              },
            ],
          }),
        ) as any,
      );

      const doc = await repo.obtenerDocumento(ID);
      expect(apiFetch).toHaveBeenCalledWith(`/documentos/${ID}`, { servicio: "bandeja" });
      expect(doc?.trazabilidad).toEqual([
        {
          etapa: "Ingreso",
          fecha: "04/10/2026",
          hora: "10:22",
          responsable: "Ana Torres",
          detalle: "Documento registrado (completo).",
          completada: true,
        },
        {
          etapa: "Envío externo",
          // 01:05 UTC del 5 es todavía el 4 en Lima.
          fecha: "04/10/2026",
          hora: "20:05",
          responsable: "ServicioGeneral",
          detalle: "Envío externo registrado; documento Atendido.",
          completada: true,
        },
      ]);
      expect(doc?.envioExterno).toEqual({
        fecha: "04/10/2026",
        hora: "20:05",
        medio: "",
        destinatario: "",
      });
    });
  });

  describe("registrarDocumento", () => {
    const archivo = () => new File(["%PDF-1.7"], "oficio.pdf", { type: "application/pdf" });

    function prepararSubida(apiFetch: any, respuestaS3 = { ok: true, status: 200 }) {
      apiFetch
        .mockResolvedValueOnce(ok({ uploadUrl: "https://s3.test/firmada", archivo_s3_key: "documentos/k.pdf" }))
        .mockResolvedValueOnce(ok(documentoApi()));
      const fetchMock = vi.fn().mockResolvedValue(respuestaS3);
      vi.stubGlobal("fetch", fetchMock);
      return fetchMock;
    }

    it("sube el PDF a S3 con la URL firmada y registra la key", async () => {
      const { repo, apiFetch } = await cargar();
      const fetchMock = prepararSubida(apiFetch);

      const id = await repo.registrarDocumento({
        procedencia: "interno",
        tipo: "Oficio",
        asunto: "Solicitud de materiales",
        via: "Digital",
        plazo: "20/10/2026",
        archivo: archivo(),
      });

      expect(id).toBe(ID);
      expect(apiFetch).toHaveBeenNthCalledWith(1, "/documentos/upload-url", {
        metodo: "POST",
        servicio: "bandeja",
        cuerpo: { nombre_archivo: "oficio.pdf" },
      });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://s3.test/firmada");
      expect(init).toMatchObject({ method: "PUT", headers: { "Content-Type": "application/pdf" } });
      expect(apiFetch).toHaveBeenNthCalledWith(2, "/documentos", {
        metodo: "POST",
        servicio: "bandeja",
        cuerpo: {
          origen: "interno",
          tipo: "Oficio",
          fecha_limite: "2026-10-20",
          prioridad: undefined,
          archivo_s3_key: "documentos/k.pdf",
          asunto: "Solicitud de materiales",
          via: "Digital",
        },
      });
    });

    it("un externo no envía tipo (RN-0025)", async () => {
      const { repo, apiFetch } = await cargar();
      prepararSubida(apiFetch);

      await repo.registrarDocumento({
        procedencia: "externo",
        tipo: "Oficio",
        asunto: "Invitación de la municipalidad",
        via: "Físico",
        plazo: "20/10/2026",
        prioridad: "Alta",
        archivo: archivo(),
      });

      expect(apiFetch.mock.calls[1][1]).toMatchObject({
        cuerpo: { origen: "externo", tipo: undefined, prioridad: "Alta" },
      });
    });

    it("si S3 rechaza la subida, no registra el documento", async () => {
      const { repo, apiFetch } = await cargar();
      prepararSubida(apiFetch, { ok: false, status: 403 });

      await expect(
        repo.registrarDocumento({
          procedencia: "interno",
          tipo: "Oficio",
          asunto: "Solicitud de materiales",
          via: "Digital",
          plazo: "20/10/2026",
          archivo: archivo(),
        }),
      ).rejects.toMatchObject({ name: "ErrorBandeja" });
      expect(apiFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("modificaciones", () => {
    it("derivar traduce la sección al nombre del backend", async () => {
      const { repo, apiFetch } = await cargar();
      apiFetch.mockResolvedValue(ok({}) as any);
      await repo.derivarDocumento(ID, "servicio-general", "Revisar");
      expect(apiFetch).toHaveBeenCalledWith(`/documentos/${ID}/derivar`, {
        metodo: "PATCH",
        servicio: "bandeja",
        cuerpo: { seccion_destino: "ServicioGeneral", nota: "Revisar" },
      });
    });

    it("derivar rechaza secciones que la bandeja no tiene", async () => {
      const { repo, apiFetch } = await cargar();
      await expect(repo.derivarDocumento(ID, "instruccion", "")).rejects.toMatchObject({ estado: 400 });
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it("marcarAtendido usa PATCH /atender", async () => {
      const { repo, apiFetch } = await cargar();
      apiFetch.mockResolvedValue(ok({}) as any);
      await repo.marcarAtendido(ID, "");
      expect(apiFetch.mock.calls[0][0]).toBe(`/documentos/${ID}/atender`);
    });

    it("asignarPrioridad convierte el plazo a ISO", async () => {
      const { repo, apiFetch } = await cargar();
      apiFetch.mockResolvedValue(ok({}) as any);
      await repo.asignarPrioridad(ID, { prioridad: "Baja", plazo: "15/11/2026" });
      expect(apiFetch.mock.calls[0][1]).toMatchObject({
        metodo: "PATCH",
        cuerpo: { prioridad: "Baja", fecha_limite: "2026-11-15" },
      });
    });

    it("registrarEnvioExterno usa POST /envio-externo", async () => {
      const { repo, apiFetch } = await cargar();
      apiFetch.mockResolvedValue(ok({}) as any);
      await repo.registrarEnvioExterno(ID, "Courier", "Municipalidad");
      expect(apiFetch).toHaveBeenCalledWith(`/documentos/${ID}/envio-externo`, {
        metodo: "POST",
        servicio: "bandeja",
        cuerpo: { medio: "Courier", destinatario: "Municipalidad" },
      });
    });

    it("actualizarAdjunto no sube nada si el id no es válido", async () => {
      const { repo, apiFetch } = await cargar();
      const archivo = new File(["%PDF-"], "a.pdf");
      await expect(repo.actualizarAdjunto("x", archivo)).rejects.toMatchObject({ estado: 404 });
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it("eliminarDocumento propaga el rechazo del backend (RN-0028)", async () => {
      const { repo, apiFetch } = await cargar();
      apiFetch.mockResolvedValue(
        falla(409, "No se puede eliminar: todavía no se confirmó la subida a Google Drive.") as any,
      );
      await expect(repo.eliminarDocumento(ID)).rejects.toThrow(/Google Drive/);
      expect(apiFetch).toHaveBeenCalledWith(`/documentos/${ID}`, { metodo: "DELETE", servicio: "bandeja" });
    });

    it("urlDescarga devuelve la URL firmada", async () => {
      const { repo, apiFetch } = await cargar();
      apiFetch.mockResolvedValue(ok({ downloadUrl: "https://s3.test/descarga" }) as any);
      await expect(repo.urlDescarga(ID)).resolves.toBe("https://s3.test/descarga");
    });
  });
});
