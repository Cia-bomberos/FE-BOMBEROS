// src/__test__/descargar-route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/sesion", () => ({ obtenerSesion: vi.fn() }));
vi.mock("../lib/documentos-repo", () => ({
  obtenerDocumento: vi.fn(),
  urlDescarga: vi.fn(),
}));
vi.mock("../lib/permisos-documentos", () => ({
  puedeVerDocumento: vi.fn(),
}));

import { GET } from "../app/panel/bandeja-documental/documentos/[id]/descargar/route";
import { obtenerSesion } from "../lib/sesion";
import { obtenerDocumento, urlDescarga } from "../lib/documentos-repo";
import { puedeVerDocumento } from "../lib/permisos-documentos";

const req = new Request("http://localhost/panel/bandeja-documental/documentos/123/descargar") as any;

describe("descargar/route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirige a login si no hay sesión", async () => {
    (obtenerSesion as any).mockResolvedValue(null);
    const res = await GET(req, { params: Promise.resolve({ id: "123" }) });
    expect(res.headers.get("location")).toContain("/login");
  });

  it("devuelve 404 si no puede ver el documento", async () => {
    (obtenerSesion as any).mockResolvedValue({ sub: "u1" });
    (obtenerDocumento as any).mockResolvedValue({ id: "123" });
    (puedeVerDocumento as any).mockReturnValue(false);

    const res = await GET(req, { params: Promise.resolve({ id: "123" }) });
    expect(res.status).toBe(404);
  });

  it("redirige a la URL firmada si todo está bien", async () => {
    (obtenerSesion as any).mockResolvedValue({ sub: "u1" });
    (obtenerDocumento as any).mockResolvedValue({ id: "123" });
    (puedeVerDocumento as any).mockReturnValue(true);
    (urlDescarga as any).mockResolvedValue("https://s3.amazonaws.com/...");

    const res = await GET(req, { params: Promise.resolve({ id: "123" }) });
    expect(res.headers.get("location")).toContain("s3.amazonaws.com");
  });

  it("devuelve 502 si falla urlDescarga", async () => {
    (obtenerSesion as any).mockResolvedValue({ sub: "u1" });
    (obtenerDocumento as any).mockResolvedValue({ id: "123" });
    (puedeVerDocumento as any).mockReturnValue(true);
    (urlDescarga as any).mockRejectedValue(new Error("fallo"));

    const res = await GET(req, { params: Promise.resolve({ id: "123" }) });
    expect(res.status).toBe(502);
  });
});