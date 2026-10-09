// src/__test__/Sidebar.test.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const pathnameMock = vi.fn(() => "/panel");
const searchParamsMock = vi.fn(() => new URLSearchParams());

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
  useSearchParams: () => searchParamsMock(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img alt={props.alt} {...props} />,
}));

vi.mock("../app/panel/iconos", () => {
  const Icono = () => <span data-testid="icono" />;
  return {
    IconBandeja: Icono,
    IconCaja: Icono,
    IconCruz: Icono,
    IconEdificio: Icono,
    IconEngranaje: Icono,
    IconMas: Icono,
    IconPersonal: Icono,
    IconTablero: Icono,
    IconUnidad: Icono,
  };
});

import { Sidebar } from "../app/panel/Sidebar";

const baseProps = {
  secciones: [],
  jefatura: false,
  administracion: false,
  pendientes: 0,
  inventario: false,
};

describe("Sidebar", () => {
  beforeEach(() => {
    pathnameMock.mockReturnValue("/panel");
    searchParamsMock.mockReturnValue(new URLSearchParams());
  });

  /* ---------------- Bandeja ---------------- */

  it("muestra 'Documentos' cuando no es vista completa", () => {
    render(<Sidebar {...baseProps} />);
    expect(screen.getByText("Documentos")).toBeTruthy();
    expect(screen.queryByText("Todos los documentos")).toBeNull();
  });

  it("muestra 'Todos los documentos' para Jefatura", () => {
    render(<Sidebar {...baseProps} jefatura />);
    expect(screen.getByText("Todos los documentos")).toBeTruthy();
  });

  it("muestra 'Todos los documentos' para Administración", () => {
    render(<Sidebar {...baseProps} administracion />);
    expect(screen.getByText("Todos los documentos")).toBeTruthy();
  });

  it("agrega enlaces de secciones operativas en vista completa", () => {
    render(<Sidebar {...baseProps} jefatura />);
    expect(screen.getByText("Servicio General")).toBeTruthy();
    expect(screen.getByText("Sanidad")).toBeTruthy();
    expect(screen.getByText("Máquinas")).toBeTruthy();
  });

  it("no agrega enlaces de secciones en vista parcial", () => {
    render(<Sidebar {...baseProps} />);
    expect(screen.queryByText("Servicio General")).toBeNull();
  });

  it("muestra el contador de pendientes si > 0", () => {
    render(<Sidebar {...baseProps} pendientes={5} />);
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("no muestra contador si pendientes = 0", () => {
    render(<Sidebar {...baseProps} pendientes={0} />);
    expect(screen.queryByText("0")).toBeNull();
  });

  /* ---------------- Institución ---------------- */

  it("muestra 'Cuentas de sección' solo para Jefatura", () => {
    render(<Sidebar {...baseProps} jefatura />);
    expect(screen.getByText("Cuentas de sección")).toBeTruthy();
  });

  it("oculta 'Cuentas de sección' para no Jefatura", () => {
    render(<Sidebar {...baseProps} />);
    expect(screen.queryByText("Cuentas de sección")).toBeNull();
  });

  it("renderiza 'Configuración' como span (próximamente)", () => {
    render(<Sidebar {...baseProps} />);
    const config = screen.getByText("Configuración");
    expect(config.tagName).not.toBe("A");
    expect(config.getAttribute("title")).toMatch(/siguiente fase/);
  });

  /* ---------------- Inventario ---------------- */

  it("no muestra Inventario aunque tenga la sección (habilitado = false)", () => {
    render(<Sidebar {...baseProps} inventario />);
    expect(screen.queryByText("Activos y recursos")).toBeNull();
  });

  it("no muestra Inventario si es Jefatura", () => {
    render(<Sidebar {...baseProps} jefatura inventario />);
    expect(screen.queryByText("Activos y recursos")).toBeNull();
  });

  /* ---------------- Estado activo ---------------- */

  it("marca como activo el enlace de la ruta actual", () => {
    pathnameMock.mockReturnValue("/panel/bandeja-documental");
    render(<Sidebar {...baseProps} />);
    const resumen = screen.getByText("Resumen").closest("a");
    expect(resumen?.className).toMatch(/enlaceActivo/);
  });

  it("marca activo según la sección de la query", () => {
    pathnameMock.mockReturnValue("/panel/bandeja-documental/documentos");
    searchParamsMock.mockReturnValue(new URLSearchParams("seccion=maquinas"));
    render(<Sidebar {...baseProps} jefatura />);
    const maquinas = screen.getByText("Máquinas").closest("a");
    expect(maquinas?.className).toMatch(/enlaceActivo/);
  });

  it("marca 'Todos los documentos' activo cuando no hay query seccion", () => {
    pathnameMock.mockReturnValue("/panel/bandeja-documental/documentos");
    searchParamsMock.mockReturnValue(new URLSearchParams());
    render(<Sidebar {...baseProps} jefatura />);
    const todos = screen.getByText("Todos los documentos").closest("a");
    expect(todos?.className).toMatch(/enlaceActivo/);
  });

  /* ---------------- Cajón móvil ---------------- */

  it("abre el cajón al pulsar la hamburguesa", () => {
    render(<Sidebar {...baseProps} />);
    const aside = document.querySelector("aside");
    expect(aside?.getAttribute("data-abierto")).toBe("false");

    fireEvent.click(screen.getByLabelText(/Abrir menú/i));
    expect(aside?.getAttribute("data-abierto")).toBe("true");
  });

  it("cierra el cajón al pulsar de nuevo la hamburguesa", () => {
    render(<Sidebar {...baseProps} />);
    fireEvent.click(screen.getByLabelText(/Abrir menú/i));

    const hamburguesa = screen
      .getAllByLabelText(/Cerrar menú/i)
      .find((b) => b.className.includes("hamburguesa"))!;
      fireEvent.click(hamburguesa);

    expect(document.querySelector("aside")?.getAttribute("data-abierto")).toBe("false");
  });

  it("cierra el cajón con Escape", () => {
    render(<Sidebar {...baseProps} />);
    fireEvent.click(screen.getByLabelText(/Abrir menú/i));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.querySelector("aside")?.getAttribute("data-abierto")).toBe("false");
  });

  it("cierra el cajón al hacer clic en el velo", () => {
    render(<Sidebar {...baseProps} />);
    fireEvent.click(screen.getByLabelText(/Abrir menú/i));

    const velo = screen
      .getAllByLabelText(/Cerrar menú/i)
      .find((b) => b.className.includes("velo"))!;
      fireEvent.click(velo);

    expect(document.querySelector("aside")?.getAttribute("data-abierto")).toBe("false");
  });

  it("cierra el cajón al hacer clic en un enlace", () => {
    render(<Sidebar {...baseProps} />);
    fireEvent.click(screen.getByLabelText(/Abrir menú/i));
    fireEvent.click(screen.getByText("Resumen"));
    expect(document.querySelector("aside")?.getAttribute("data-abierto")).toBe("false");
  });
});