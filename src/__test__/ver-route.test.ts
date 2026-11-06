// src/__test__/ver-route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/sesion", () => ({ obtenerSesion: vi.fn() }));
vi.mock("../lib/documentos-repo", () => ({
  obtenerDocumento: vi.fn(),
  urlDescarga: vi.fn(),
  urlVistaPrevia: vi.fn(),
}));
vi.mock("../lib/permisos-documentos", () => ({
  puedeVerDocumentoDerivado: vi.fn(),
}));

import { GET } from "../app/panel/bandeja-documental/documentos/[id]/ver/route";
import { obtenerSesion } from "../lib/sesion";
import { obtenerDocumento, urlDescarga, urlVistaPrevia } from "../lib/documentos-repo";
import { puedeVerDocumentoDerivado } from "../lib/permisos-documentos";

const req = new Request("http://localhost/panel/bandeja-documental/documentos/123/ver") as any;
const contexto = { params: Promise.resolve({ id: "123" }) };
const documento = { id: "123", numero: "001-2026", adjunto: { nombre: "Documento PDF" } };

describe("ver/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (obtenerSesion as any).mockResolvedValue({ sub: "u1" });
    (obtenerDocumento as any).mockResolvedValue(documento);
    (puedeVerDocumentoDerivado as any).mockReturnValue(true);
    (urlVistaPrevia as any).mockResolvedValue("https://s3.amazonaws.com/vista");
  });

  it("redirige a login si no hay sesión", async () => {
    (obtenerSesion as any).mockResolvedValue(null);
    const res = await GET(req, contexto);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("devuelve 404 si no puede ver el documento", async () => {
    (puedeVerDocumentoDerivado as any).mockReturnValue(false);
    const res = await GET(req, contexto);
    expect(res.status).toBe(404);
    expect(urlVistaPrevia).not.toHaveBeenCalled();
  });

  it("devuelve 404 si el documento no tiene archivo", async () => {
    (obtenerDocumento as any).mockResolvedValue({ ...documento, adjunto: undefined });
    const res = await GET(req, contexto);
    expect(res.status).toBe(404);
    expect(urlVistaPrevia).not.toHaveBeenCalled();
  });

  it("devuelve 404 si falla la consulta del documento", async () => {
    (obtenerDocumento as any).mockRejectedValue(new Error("fallo"));
    const res = await GET(req, contexto);
    expect(res.status).toBe(404);
  });

  it("muestra el PDF en línea sin pasar por el endpoint de descarga", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("%PDF", { headers: { "content-type": "text/html" } }),
    );

    const res = await GET(req, contexto);

    expect(fetchSpy).toHaveBeenCalledWith("https://s3.amazonaws.com/vista", { cache: "no-store" });
    expect(urlDescarga).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/^inline; filename="001-2026\.pdf"/);
    // Aunque el almacenamiento diga otra cosa, nunca se interpreta como HTML.
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.text()).toBe("%PDF");
    fetchSpy.mockRestore();
  });

  it("devuelve 502 si el backend no entrega la URL", async () => {
    (urlVistaPrevia as any).mockRejectedValue(new Error("fallo"));
    const res = await GET(req, contexto);
    expect(res.status).toBe(502);
  });

  it("devuelve 502 si S3 responde con error", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("AccessDenied", { status: 403 }),
    );
    const res = await GET(req, contexto);
    expect(res.status).toBe(502);
    fetchSpy.mockRestore();
  });
});
