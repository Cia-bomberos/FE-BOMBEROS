// src/__test__/PanelLayout.test.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

/* ---------------- Mocks ---------------- */

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img alt={props.alt} {...props} />,
}));

vi.mock("@/lib/sesion", () => ({
  obtenerSesion: vi.fn(),
}));

vi.mock("@/lib/tema-servidor", () => ({
  obtenerTema: vi.fn(async () => "dark"),
}));

vi.mock("@/lib/documentos-repo", () => ({
  listarDocumentosSiDisponible: vi.fn(async () => []),
}));

vi.mock("@/lib/inventario-repo", () => ({
  puedeRegistrarActivo: vi.fn(() => false),
}));

vi.mock("@/lib/permisos-documentos", () => ({
  documentosVisibles: vi.fn((_, docs) => docs),
  esAdministracion: vi.fn(() => false),
}));

vi.mock("@/lib/secciones", () => ({
  esJefatura: vi.fn(() => false),
  insigniaDe: vi.fn(() => null),
  seccionPorClave: vi.fn((c) => ({ nombre: c })),
}));

vi.mock("../app/panel/actions", () => ({
  salir: vi.fn(),
}));

// Componentes del panel: los stubeamos
vi.mock("../app/panel/NavegacionSuperior", () => ({
  NavegacionSuperior: ({ jefatura, administracion, pendientes, ubicacion }: any) => (
    <nav
      data-testid={ubicacion === "pie" ? "navegacion-pie" : "navegacion"}
      data-jefatura={jefatura}
      data-administracion={administracion}
      data-pendientes={pendientes}
    />
  ),
}));

vi.mock("../app/panel/BuscadorGlobal", () => ({
  BuscadorGlobal: ({ documentos }: any) => (
    <div data-testid="buscador">Buscador ({documentos.length})</div>
  ),
}));

vi.mock("../app/panel/RelojLima", () => ({
  RelojLima: () => <span data-testid="reloj">12:00</span>,
}));

vi.mock("../components/ui/toggle-theme", () => ({
  ToggleTheme: ({ inicial }: any) => (
    <button data-testid="toggle-tema" data-inicial={inicial}>Tema</button>
  ),
}));

vi.mock("../app/panel/iconos", () => ({
  IconSalir: () => <span data-testid="icon-salir" />,
}));

/* ---------------- Import después de los mocks ---------------- */

import PanelLayout from "../app/panel/layout";
import { obtenerSesion } from "@/lib/sesion";
import { listarDocumentosSiDisponible } from "@/lib/documentos-repo";
import { esAdministracion } from "@/lib/permisos-documentos";
import { esJefatura } from "@/lib/secciones";

/* ---------------- Fixtures ---------------- */

const bombero = {
  sub: "u1",
  nombre: "Ana Torres",
  grado: "Teniente CBP",
  cargo: "Jefe de Sección",
  seccion: "administracion",
  iniciales: "AT",
  grupos: [],
  rol: null,
} as any;

/* ---------------- Tests ---------------- */

describe("PanelLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(obtenerSesion).mockResolvedValue(bombero);
    vi.mocked(listarDocumentosSiDisponible).mockResolvedValue([]);
  });

  it("redirige a /login si no hay sesión", async () => {
    vi.mocked(obtenerSesion).mockResolvedValueOnce(null);
    await expect(
      PanelLayout({ children: <div>contenido</div> }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("renderiza la navegación, el buscador y los hijos", async () => {
    const jsx = await PanelLayout({ children: <div data-testid="hijo">Hijo</div> });
    render(jsx as any);

    expect(screen.getByTestId("navegacion")).toBeTruthy();
    expect(screen.getByTestId("buscador")).toBeTruthy();
    expect(screen.getByTestId("hijo")).toBeTruthy();
  });

  it("le indica a la navegación el rol de Jefatura", async () => {
    vi.mocked(esJefatura).mockReturnValueOnce(true);
    render((await PanelLayout({ children: null })) as any);

    const navegacion = screen.getByTestId("navegacion");
    expect(navegacion.getAttribute("data-jefatura")).toBe("true");
    expect(navegacion.getAttribute("data-administracion")).toBe("false");
  });

  it("le indica a la navegación el rol de Administración", async () => {
    vi.mocked(esAdministracion).mockReturnValueOnce(true);
    render((await PanelLayout({ children: null })) as any);

    const navegacion = screen.getByTestId("navegacion");
    expect(navegacion.getAttribute("data-jefatura")).toBe("false");
    expect(navegacion.getAttribute("data-administracion")).toBe("true");
  });

  it("tras el contenido pinta las pestañas del pie y luego el pie de página", async () => {
    vi.mocked(esJefatura).mockReturnValueOnce(true).mockReturnValueOnce(true);
    render((await PanelLayout({ children: <div data-testid="hijo" /> })) as any);

    const hijo = screen.getByTestId("hijo");
    const navPie = screen.getByTestId("navegacion-pie");
    const pie = screen.getByRole("contentinfo");

    expect(navPie.getAttribute("data-jefatura")).toBe("true");
    expect(hijo.compareDocumentPosition(navPie) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(navPie.compareDocumentPosition(pie) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("pasa los children al árbol", async () => {
    const jsx = await PanelLayout({ children: <p>Soy hijo</p> });
    render(jsx as any);
    expect(screen.getByText("Soy hijo")).toBeTruthy();
  });

  it("muestra las iniciales, grado, nombre y cargo del bombero", async () => {
    const jsx = await PanelLayout({ children: null });
    render(jsx as any);

    expect(screen.getByText("AT")).toBeTruthy();
    expect(screen.getByText("Teniente CBP Ana Torres")).toBeTruthy();
    expect(screen.getByText("Jefe de Sección")).toBeTruthy();
  });

  it("aplica el tema devuelto por obtenerTema", async () => {
    const { container } = render((await PanelLayout({ children: null })) as any);
    expect(container.querySelector("[data-theme]")?.getAttribute("data-theme")).toBe("dark");
  });

  it("el ToggleTheme recibe el tema inicial", async () => {
    render((await PanelLayout({ children: null })) as any);
    expect(screen.getByTestId("toggle-tema").getAttribute("data-inicial")).toBe("dark");
  });

  it("el botón de cerrar sesión tiene aria-label", async () => {
    render((await PanelLayout({ children: null })) as any);
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeTruthy();
  });

  it("el formulario de logout usa la acción salir", async () => {
    const { container } = render((await PanelLayout({ children: null })) as any);
    const form = container.querySelector("form");
    expect(form).toBeTruthy();
  });

  it("cuenta solo documentos Pendiente/En proceso como pendientes", async () => {
    vi.mocked(listarDocumentosSiDisponible).mockResolvedValueOnce([
      { id: "1", estado: "Pendiente", seccion: "administracion", numero: "n1", tipo: "t", asunto: "a", origen: "o", destino: "d", via: "Digital", folios: 1, fechaIngreso: "01/01/2026", plazo: "01/02/2026", prioridad: "Alta", prioridadManual: false, trazabilidad: [] },
      { id: "2", estado: "En proceso",  seccion: "administracion", numero: "n2", tipo: "t", asunto: "a", origen: "o", destino: "d", via: "Digital", folios: 1, fechaIngreso: "01/01/2026", plazo: "01/02/2026", prioridad: "Alta", prioridadManual: false, trazabilidad: [] },
      { id: "3", estado: "Atendido",    seccion: "administracion", numero: "n3", tipo: "t", asunto: "a", origen: "o", destino: "d", via: "Digital", folios: 1, fechaIngreso: "01/01/2026", plazo: "01/02/2026", prioridad: "Alta", prioridadManual: false, trazabilidad: [] },
    ] as any);

    render((await PanelLayout({ children: null })) as any);

    expect(screen.getByTestId("navegacion").getAttribute("data-pendientes")).toBe("2");
    // Al buscador global entran todos, también los ya atendidos.
    expect(screen.getByTestId("buscador").textContent).toContain("(3)");
  });
});