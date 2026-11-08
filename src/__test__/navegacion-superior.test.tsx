import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const pathnameMock = vi.fn(() => "/panel/bandeja-documental");
const searchParamsMock = vi.fn(() => new URLSearchParams());

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
  useSearchParams: () => searchParamsMock(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ fill: _fill, ...props }: any) => <img alt={props.alt} {...props} />,
}));

import { NavegacionSuperior } from "../app/panel/NavegacionSuperior";

const seccion = { jefatura: false, administracion: false, pendientes: 0, insignia: null };
const jefatura = { ...seccion, jefatura: true };
const administracion = { ...seccion, administracion: true };

const enlace = (nombre: RegExp) => screen.getByRole("link", { name: nombre });
const botonDocumentos = () => screen.getByRole("button", { name: /Documentos/ });
const riel = (container: HTMLElement) => container.querySelector<HTMLElement>('[style*="--posicion"]');

describe("NavegacionSuperior", () => {
  beforeEach(() => {
    pathnameMock.mockReturnValue("/panel/bandeja-documental");
    searchParamsMock.mockReturnValue(new URLSearchParams());
  });

  afterEach(cleanup);

  /* ---------------- Pestañas por rol ---------------- */

  describe("una sección", () => {
    it("ve Resumen y Documentos como enlaces directos", () => {
      render(<NavegacionSuperior {...seccion} />);
      expect(enlace(/Resumen/).getAttribute("href")).toBe("/panel/bandeja-documental");
      expect(enlace(/Documentos/).getAttribute("href")).toBe("/panel/bandeja-documental/documentos");
      expect(screen.queryByRole("button")).toBeNull();
    });

    it("no ve Cuentas ni Respaldo", () => {
      render(<NavegacionSuperior {...seccion} />);
      expect(screen.queryByRole("link", { name: /Cuentas/ })).toBeNull();
      expect(screen.queryByRole("link", { name: /Respaldo/ })).toBeNull();
    });
  });

  describe("Jefatura", () => {
    it("abre Documentos como menú y ve Cuentas", () => {
      render(<NavegacionSuperior {...jefatura} />);
      expect(botonDocumentos()).toBeTruthy();
      expect(enlace(/Cuentas/).getAttribute("href")).toBe("/panel/cuentas");
      expect(screen.queryByRole("link", { name: /Respaldo/ })).toBeNull();
    });
  });

  describe("Administración", () => {
    it("abre Documentos como menú y ve Respaldo", () => {
      render(<NavegacionSuperior {...administracion} />);
      expect(botonDocumentos()).toBeTruthy();
      expect(enlace(/Respaldo/).getAttribute("href")).toBe("/panel/configuracion/drive");
      expect(screen.queryByRole("link", { name: /Cuentas/ })).toBeNull();
    });
  });

  /* ---------------- Pestaña activa y riel ---------------- */

  describe("pestaña activa", () => {
    it.each([
      ["/panel/bandeja-documental", /Resumen/, /Documentos/],
      ["/panel/bandeja-documental/documentos", /Documentos/, /Resumen/],
      ["/panel/bandeja-documental/documentos/001-2026", /Documentos/, /Resumen/],
      ["/panel/bandeja-documental/registrar", /Documentos/, /Resumen/],
    ])("en %s marca la correcta", (ruta, activa, inactiva) => {
      pathnameMock.mockReturnValue(ruta);
      render(<NavegacionSuperior {...seccion} />);
      expect(enlace(activa).getAttribute("aria-current")).toBe("page");
      expect(enlace(inactiva).getAttribute("aria-current")).toBeNull();
    });

    it("marca Documentos aunque sea el botón del menú", () => {
      pathnameMock.mockReturnValue("/panel/bandeja-documental/documentos/001-2026");
      render(<NavegacionSuperior {...jefatura} />);
      expect(botonDocumentos().getAttribute("data-activa")).toBe("true");
    });

    it("marca Cuentas en su ruta", () => {
      pathnameMock.mockReturnValue("/panel/cuentas");
      render(<NavegacionSuperior {...jefatura} />);
      expect(enlace(/Cuentas/).getAttribute("aria-current")).toBe("page");
    });

    it("marca Respaldo en su ruta", () => {
      pathnameMock.mockReturnValue("/panel/configuracion/drive");
      render(<NavegacionSuperior {...administracion} />);
      expect(enlace(/Respaldo/).getAttribute("aria-current")).toBe("page");
    });

    it.each([
      ["sección en Documentos", seccion, "/panel/bandeja-documental/documentos", "2", "1"],
      ["Jefatura en Cuentas", jefatura, "/panel/cuentas", "3", "2"],
      ["Administración en Respaldo", administracion, "/panel/configuracion/drive", "3", "2"],
    ])("el riel se ubica sobre la pestaña: %s", (_, props, ruta, pestanas, posicion) => {
      pathnameMock.mockReturnValue(ruta);
      const { container } = render(<NavegacionSuperior {...props} />);
      expect(riel(container)?.style.getPropertyValue("--pestanas")).toBe(pestanas);
      expect(riel(container)?.style.getPropertyValue("--posicion")).toBe(posicion);
    });

    it("fuera de las pestañas no marca ninguna ni muestra el riel", () => {
      pathnameMock.mockReturnValue("/panel/dashboard");
      const { container } = render(<NavegacionSuperior {...seccion} />);
      expect(container.querySelector('[aria-current="page"]')).toBeNull();
      expect(riel(container)).toBeNull();
    });
  });

  /* ---------------- Ubicación ---------------- */

  describe("ubicación", () => {
    it("en la barra pinta la marca y las pestañas", () => {
      render(<NavegacionSuperior {...jefatura} />);
      expect(screen.getByText("France N°3")).toBeTruthy();
      expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeTruthy();
    });

    it("en el pie pinta solo las pestañas, con su propia clase", () => {
      render(<NavegacionSuperior {...jefatura} ubicacion="pie" />);
      expect(screen.queryByText("France N°3")).toBeNull();
      const nav = screen.getByRole("navigation", { name: "Navegación principal" });
      expect(nav.className).toMatch(/navPie/);
      expect(enlace(/Cuentas/)).toBeTruthy();
    });
  });

  /* ---------------- Menú de Documentos ---------------- */

  describe("menú de Documentos", () => {
    it("arranca cerrado", () => {
      render(<NavegacionSuperior {...jefatura} />);
      expect(botonDocumentos().getAttribute("aria-expanded")).toBe("false");
      expect(screen.queryByRole("link", { name: "Sanidad" })).toBeNull();
    });

    it("lista todos los documentos y las cuatro secciones", () => {
      render(<NavegacionSuperior {...jefatura} />);
      fireEvent.click(botonDocumentos());

      expect(botonDocumentos().getAttribute("aria-expanded")).toBe("true");
      const base = "/panel/bandeja-documental/documentos";
      expect(enlace(/^Todos los Documentos$/).getAttribute("href")).toBe(base);
      expect(enlace(/^Administración$/).getAttribute("href")).toBe(`${base}?seccion=administracion`);
      expect(enlace(/^Servicio General$/).getAttribute("href")).toBe(`${base}?seccion=servicio-general`);
      expect(enlace(/^Sanidad$/).getAttribute("href")).toBe(`${base}?seccion=sanidad`);
      expect(enlace(/^Máquinas$/).getAttribute("href")).toBe(`${base}?seccion=maquinas`);
    });

    it("se cierra al pulsar de nuevo el botón", () => {
      render(<NavegacionSuperior {...jefatura} />);
      fireEvent.click(botonDocumentos());
      fireEvent.click(botonDocumentos());
      expect(screen.queryByRole("link", { name: "Sanidad" })).toBeNull();
    });

    it("se cierra con Escape y devuelve el foco al botón", () => {
      render(<NavegacionSuperior {...jefatura} />);
      fireEvent.click(botonDocumentos());
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("link", { name: "Sanidad" })).toBeNull();
      expect(document.activeElement).toBe(botonDocumentos());
    });

    it("se cierra al pulsar fuera, pero no al pulsar dentro", () => {
      render(<NavegacionSuperior {...jefatura} />);
      fireEvent.click(botonDocumentos());

      fireEvent.pointerDown(enlace(/^Sanidad$/));
      expect(screen.getByRole("link", { name: "Sanidad" })).toBeTruthy();

      fireEvent.pointerDown(document.body);
      expect(screen.queryByRole("link", { name: "Sanidad" })).toBeNull();
    });

    it("se cierra al elegir una opción", () => {
      render(<NavegacionSuperior {...jefatura} />);
      fireEvent.click(botonDocumentos());
      fireEvent.click(enlace(/^Sanidad$/));
      expect(screen.queryByRole("link", { name: "Sanidad" })).toBeNull();
    });

    it("se cierra cuando el foco sale del menú", () => {
      render(<NavegacionSuperior {...jefatura} />);
      fireEvent.click(botonDocumentos());
      fireEvent.blur(enlace(/^Máquinas$/), { relatedTarget: enlace(/Cuentas/) });
      expect(screen.queryByRole("link", { name: "Sanidad" })).toBeNull();
    });

    it("sigue abierto si el foco se mueve dentro del menú", () => {
      render(<NavegacionSuperior {...jefatura} />);
      fireEvent.click(botonDocumentos());
      fireEvent.blur(enlace(/^Sanidad$/), { relatedTarget: enlace(/^Máquinas$/) });
      expect(screen.getByRole("link", { name: "Sanidad" })).toBeTruthy();
    });

    it("marca la sección activa según la query", () => {
      pathnameMock.mockReturnValue("/panel/bandeja-documental/documentos");
      searchParamsMock.mockReturnValue(new URLSearchParams("seccion=sanidad"));
      render(<NavegacionSuperior {...jefatura} />);
      fireEvent.click(botonDocumentos());

      expect(enlace(/^Sanidad$/).getAttribute("aria-current")).toBe("page");
      expect(enlace(/^Todos los Documentos$/).getAttribute("aria-current")).toBeNull();
    });

    it("marca 'Todos los Documentos' sin query de sección", () => {
      pathnameMock.mockReturnValue("/panel/bandeja-documental/documentos");
      render(<NavegacionSuperior {...jefatura} />);
      fireEvent.click(botonDocumentos());
      expect(enlace(/^Todos los Documentos$/).getAttribute("aria-current")).toBe("page");
    });

    it("no marca opciones en el detalle de un documento", () => {
      pathnameMock.mockReturnValue("/panel/bandeja-documental/documentos/001-2026");
      const { container } = render(<NavegacionSuperior {...jefatura} />);
      fireEvent.click(botonDocumentos());
      expect(container.querySelector('li [aria-current="page"]')).toBeNull();
    });
  });

  /* ---------------- Contador e insignia ---------------- */

  it("muestra el contador solo si hay pendientes", () => {
    const { rerender } = render(<NavegacionSuperior {...seccion} pendientes={17} />);
    expect(screen.getByText("17")).toBeTruthy();
    rerender(<NavegacionSuperior {...seccion} pendientes={0} />);
    expect(screen.queryByText("0")).toBeNull();
  });

  it("muestra el contador también en el botón del menú", () => {
    render(<NavegacionSuperior {...jefatura} pendientes={9} />);
    expect(botonDocumentos().textContent).toContain("9");
  });

  it("usa la insignia de la sección o, sin ella, el escudo", () => {
    const { rerender } = render(
      <NavegacionSuperior {...seccion} insignia={{ src: "/insignias/sanidad.png", alt: "Sanidad" }} />,
    );
    expect(screen.getByAltText("Sanidad").getAttribute("src")).toBe("/insignias/sanidad.png");
    rerender(<NavegacionSuperior {...seccion} insignia={null} />);
    expect(screen.getByAltText("Escudo France N°3")).toBeTruthy();
  });
});
