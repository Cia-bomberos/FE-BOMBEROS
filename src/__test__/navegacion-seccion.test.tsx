import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const pathnameMock = vi.fn(() => "/panel/bandeja-documental");

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
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

import { NavegacionSeccion } from "../app/panel/NavegacionSeccion";

const enlace = (nombre: RegExp) => screen.getByRole("link", { name: nombre });

describe("NavegacionSeccion", () => {
  beforeEach(() => {
    pathnameMock.mockReturnValue("/panel/bandeja-documental");
  });

  it("enlaza Resumen y Documentos", () => {
    render(<NavegacionSeccion pendientes={0} insignia={null} />);
    expect(enlace(/Resumen/).getAttribute("href")).toBe("/panel/bandeja-documental");
    expect(enlace(/Documentos/).getAttribute("href")).toBe("/panel/bandeja-documental/documentos");
  });

  it.each([
    ["/panel/bandeja-documental", /Resumen/, /Documentos/],
    ["/panel/bandeja-documental/documentos", /Documentos/, /Resumen/],
    ["/panel/bandeja-documental/documentos/001-2026", /Documentos/, /Resumen/],
    ["/panel/bandeja-documental/registrar", /Documentos/, /Resumen/],
  ])("en %s marca la pestaña correcta", (ruta, activa, inactiva) => {
    pathnameMock.mockReturnValue(ruta);
    render(<NavegacionSeccion pendientes={0} insignia={null} />);
    expect(enlace(activa).getAttribute("aria-current")).toBe("page");
    expect(enlace(inactiva).getAttribute("aria-current")).toBeNull();
  });

  it("fuera de la bandeja no marca ninguna pestaña y oculta el riel", () => {
    pathnameMock.mockReturnValue("/panel/dashboard");
    const { container } = render(<NavegacionSeccion pendientes={0} insignia={null} />);
    expect(container.querySelector('[aria-current="page"]')).toBeNull();
    expect(container.querySelector("[data-activa]")).toBeNull();
  });

  it("el riel acompaña a la pestaña activa", () => {
    pathnameMock.mockReturnValue("/panel/bandeja-documental/documentos");
    const { container } = render(<NavegacionSeccion pendientes={0} insignia={null} />);
    expect(container.querySelector("[data-activa]")?.getAttribute("data-activa")).toBe("documentos");
  });

  it("muestra el contador solo si hay pendientes", () => {
    const { rerender } = render(<NavegacionSeccion pendientes={17} insignia={null} />);
    expect(screen.getByText("17")).toBeTruthy();
    rerender(<NavegacionSeccion pendientes={0} insignia={null} />);
    expect(screen.queryByText("0")).toBeNull();
  });

  it("usa la insignia de la sección o, sin ella, el escudo", () => {
    const { rerender } = render(
      <NavegacionSeccion pendientes={0} insignia={{ src: "/insignias/sanidad.png", alt: "Sanidad" }} />,
    );
    expect(screen.getByAltText("Sanidad").getAttribute("src")).toBe("/insignias/sanidad.png");
    rerender(<NavegacionSeccion pendientes={0} insignia={null} />);
    expect(screen.getByAltText("Escudo France N°3")).toBeTruthy();
  });
});
