// src/__test__/detalle-documento-page.test.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
  notFound: vi.fn(() => {
    throw Object.assign(new Error("NEXT_NOT_FOUND"));
  }),
}));

vi.mock("@/lib/sesion", () => ({
  obtenerSesion: vi.fn(),
}));

vi.mock("@/lib/documentos-repo", () => ({
  obtenerDocumento: vi.fn(),
}));

vi.mock("@/lib/permisos-documentos", () => ({
  puedeVerDocumento: vi.fn(),
  puedeGestionarDocumento: vi.fn(),
  puedeEliminar: vi.fn(),
  SECCIONES_BANDEJA: ["administracion", "servicio-general", "maquinas", "sanidad"],
}));

vi.mock("@/lib/secciones", () => ({
  SECCIONES: [
    { clave: "administracion", nombre: "Administración" },
    { clave: "maquinas", nombre: "Máquinas" },
  ],
  seccionPorClave: vi.fn((c) => ({ nombre: c === "administracion" ? "Administración" : c })),
}));

vi.mock("@/app/panel/bandeja-documental/documentos/[id]/AccionesDocumento", () => ({
  AccionesDocumento: ({ documento }: any) => (
    <div data-testid="acciones">Acciones ({documento.id})</div>
  ),
}));

vi.mock("@/app/panel/bandeja-documental/documentos/[id]/EliminarArchivado", () => ({
  EliminarArchivado: ({ id }: any) => <div data-testid="eliminar">Eliminar {id}</div>,
}));

vi.mock("@/app/panel/bandeja-documental/Etiquetas", () => ({
  EtiquetaEstado: ({ estado }: any) => <span>{estado}</span>,
  EtiquetaPrioridad: ({ prioridad }: any) => <span>{prioridad}</span>,
}));

vi.mock("@/app/panel/iconos", () => ({
  IconDescarga: () => <span data-testid="icon-descarga" />,
}));

import DetalleDocumento, {
  generateMetadata,
} from "../app/panel/bandeja-documental/documentos/[id]/page";
import { obtenerSesion } from "@/lib/sesion";
import { obtenerDocumento } from "@/lib/documentos-repo";
import {
  puedeEliminar,
  puedeGestionarDocumento,
  puedeVerDocumento,
} from "@/lib/permisos-documentos";

const bombero = { sub: "u1", nombre: "Ana" } as any;

const documento = {
  id: "001-2026",
  tipo: "Oficio",
  numero: "Oficio N° 001-2026",
  asunto: "Solicitud de materiales",
  origen: "Comandancia",
  destino: "Administración",
  seccion: "administracion",
  via: "Digital",
  folios: 2,
  fechaIngreso: "01/01/2026",
  plazo: "15/01/2026",
  estado: "En proceso",
  prioridad: "Alta",
  prioridadManual: false,
  trazabilidad: [
    { etapa: "Ingreso", fecha: "01/01/2026", hora: "10:00", responsable: "X", detalle: "ingresó", completada: true },
    { etapa: "Derivación", fecha: "", hora: "", responsable: "", detalle: "pendiente", completada: false },
  ],
  adjunto: undefined as any,
} as any;

async function renderPage(id = "001-2026") {
  const jsx = await DetalleDocumento({ params: Promise.resolve({ id }) });
  return render(jsx as any);
}

describe("documentos/[id]/page.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(obtenerSesion).mockResolvedValue(bombero);
    vi.mocked(obtenerDocumento).mockResolvedValue(documento);
    vi.mocked(puedeVerDocumento).mockReturnValue(true);
    vi.mocked(puedeGestionarDocumento).mockReturnValue(true);
    vi.mocked(puedeEliminar).mockReturnValue(false);
  });

  /* ---------------- generateMetadata ---------------- */

  describe("generateMetadata", () => {
    it("devuelve el número del documento", async () => {
      const meta = await generateMetadata({ params: Promise.resolve({ id: "001-2026" }) });
      expect(meta.title).toBe("Oficio N° 001-2026");
    });

    it("devuelve 'Documento' si no existe", async () => {
      vi.mocked(obtenerDocumento).mockResolvedValueOnce(null);
      const meta = await generateMetadata({ params: Promise.resolve({ id: "x" }) });
      expect(meta.title).toBe("Documento");
    });
  });

  /* ---------------- Redirect ---------------- */

  it("redirige a login si no hay sesión", async () => {
    vi.mocked(obtenerSesion).mockResolvedValueOnce(null);
    await expect(renderPage()).rejects.toThrow(/NEXT_REDIRECT/);
  });

  /* ---------------- notFound ---------------- */

  it("notFound si el documento no existe", async () => {
    vi.mocked(obtenerDocumento).mockResolvedValueOnce(null);
    await expect(renderPage()).rejects.toThrow(/NEXT_NOT_FOUND/);
  });

  it("notFound si no puede verlo", async () => {
    vi.mocked(puedeVerDocumento).mockReturnValueOnce(false);
    await expect(renderPage()).rejects.toThrow(/NEXT_NOT_FOUND/);
  });

  /* ---------------- Encabezado ---------------- */

  it("renderiza número, tipo y migas", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { name: "Oficio N° 001-2026" })).toBeTruthy();

    // Las migas contienen "Documentos · Oficio"
    const migas = screen.getByText("Documentos").closest("p")!;
    expect(migas.textContent).toMatch(/Oficio/);
  });

  it("las migas enlazan a la bandeja", async () => {
    await renderPage();
    const link = screen.getByText("Documentos").closest("a");
    expect(link?.getAttribute("href")).toBe("/panel/bandeja-documental/documentos");
  });

  /* ---------------- Ficha ---------------- */

  it.each([
    {
      name: "renderiza el asunto destacado",
      overrides: {},
      verify: () => {
        expect(screen.getByText("Solicitud de materiales")).toBeTruthy();
      },
    },
    {
      name: "renderiza la ficha con etiquetas clave",
      overrides: {},
      verify: () => {
        expect(screen.getByText("Remitente")).toBeTruthy();
        expect(screen.getByText("Comandancia")).toBeTruthy();
        expect(screen.getByText("Folios")).toBeTruthy();
        expect(screen.getByText("2")).toBeTruthy();
        expect(screen.getByText("Código único")).toBeTruthy();
        expect(screen.getAllByText("Oficio N° 001-2026").length).toBeGreaterThan(0);
      },
    },
    {
      name: "un externo no muestra código único (RN-0025)",
      overrides: { modalidad: "simplificado" as const },
      verify: () => {
        expect(screen.getByText("No aplica (externo)")).toBeTruthy();
      },
    },
    {
      name: "prioridad manual añade sufijo '(manual)'",
      overrides: { prioridadManual: true },
      verify: () => {
        expect(screen.getByText("Alta (manual)")).toBeTruthy();
      },
    },
    {
      name: "prioridad no manual añade sufijo '(por plazo)'",
      overrides: { prioridadManual: false },
      verify: () => {
        expect(screen.getByText("Alta (por plazo)")).toBeTruthy();
      },
    },
  ])("$name", async ({ overrides, verify }) => {
    vi.mocked(obtenerDocumento).mockResolvedValueOnce({
      ...documento,
      ...overrides,
    });
    await renderPage();
    verify();
  });

  /* ---------------- Adjunto ---------------- */

  it("si no hay adjunto muestra 'Sin archivo adjunto'", async () => {
    await renderPage();
    expect(screen.getByText("Sin archivo adjunto")).toBeTruthy();
  });

  it("si hay adjunto muestra su nombre", async () => {
    vi.mocked(obtenerDocumento).mockResolvedValueOnce({
      ...documento,
      adjunto: { nombre: "oficio.pdf", tamano: "12 KB", actualizado: "01/01/2026" },
    });
    await renderPage();
    expect(screen.getByText("oficio.pdf")).toBeTruthy();
  });

  it("el botón Descargar está deshabilitado sin adjunto", async () => {
    await renderPage();
    const btn = screen.getByRole("button", { name: /Descargar/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("con adjunto, Descargar enlaza a la ruta de descarga", async () => {
    vi.mocked(obtenerDocumento).mockResolvedValueOnce({
      ...documento,
      adjunto: { nombre: "x.pdf", tamano: "1 KB", actualizado: "01/01/2026" },
    });
    await renderPage();
    const enlace = screen.getByRole("link", { name: /Descargar/ });
    expect(enlace.getAttribute("href")).toBe(
      "/panel/bandeja-documental/documentos/001-2026/descargar",
    );
  });

  /* ---------------- Trazabilidad ---------------- */

  it("renderiza las etapas", async () => {
    await renderPage();
    expect(screen.getByText("Ingreso")).toBeTruthy();
    expect(screen.getByText("Derivación")).toBeTruthy();
  });

  it("etapa completada muestra fecha y responsable", async () => {
    await renderPage();
    expect(screen.getByText(/01\/01\/2026 · 10:00 · X/)).toBeTruthy();
  });

  it("etapa pendiente muestra 'Pendiente'", async () => {
    await renderPage();
    expect(screen.getByText("Pendiente")).toBeTruthy();
  });

  /* ---------------- Gestión ---------------- */

  it("si gestiona, renderiza AccionesDocumento", async () => {
    await renderPage();
    expect(screen.getByTestId("acciones")).toBeTruthy();
  });

  it("si NO gestiona, muestra aviso de solo lectura", async () => {
    vi.mocked(puedeGestionarDocumento).mockReturnValueOnce(false);
    await renderPage();
    expect(screen.getByText(/solo lectura/)).toBeTruthy();
    expect(screen.queryByTestId("acciones")).toBeNull();
  });

  /* ---------------- Eliminar ---------------- */

  it("si puedeEliminar, renderiza EliminarArchivado", async () => {
    vi.mocked(puedeEliminar).mockReturnValueOnce(true);
    await renderPage();
    expect(screen.getByTestId("eliminar")).toBeTruthy();
  });

  it("si NO puedeEliminar, no renderiza EliminarArchivado", async () => {
    await renderPage();
    expect(screen.queryByTestId("eliminar")).toBeNull();
  });
});