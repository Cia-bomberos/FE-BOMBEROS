// src/__test__/encabezado-seccion.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/app/panel/dashboard/SelectorPeriodo", () => ({
  SelectorPeriodo: ({ ruta, actual }: any) => (
    <div data-testid="selector-periodo">selector {ruta} · {actual}</div>
  ),
}));

vi.mock("@/lib/secciones", () => ({
  ETIQUETA_FUENTE: {
    inventario: "inventario",
    documental: "bandeja documental",
    registro: "registro manual",
  },
}));

import { EncabezadoSeccion } from "../app/panel/dashboard/Encabezado";

const seccion = {
  clave: "servicio-general",
  nombre: "Servicio General",
  ruta: "/panel/dashboard/servicio-general",
  descripcion: "Mantenimiento e infraestructura",
  fuente: "inventario" as const,
  fuenteDetalle: "Se calcula del inventario de la sección",
} as any;

describe("EncabezadoSeccion", () => {
  it("renderiza las migas con el nombre de la sección", () => {
    render(<EncabezadoSeccion seccion={seccion} periodo="2026-08" />);
    const migas = screen.getByText(/Dashboard ejecutivo/).closest("p")!;
    expect(migas.textContent).toMatch(/Servicio General/);
  });
  it("renderiza el título", () => {
    render(<EncabezadoSeccion seccion={seccion} periodo="2026-08" />);
    expect(screen.getByRole("heading", { name: "Servicio General" })).toBeTruthy();
  });

  it("renderiza el subtítulo con la descripción", () => {
    render(<EncabezadoSeccion seccion={seccion} periodo="2026-08" />);
    expect(screen.getByText("Mantenimiento e infraestructura")).toBeTruthy();
  });

  it("muestra la etiqueta de la fuente", () => {
    render(<EncabezadoSeccion seccion={seccion} periodo="2026-08" />);
    expect(screen.getByText(/Fuente: inventario/)).toBeTruthy();
  });

  it("el chip tiene el detalle de la fuente como title", () => {
    render(<EncabezadoSeccion seccion={seccion} periodo="2026-08" />);
    const chip = screen.getByText(/Fuente:/).closest("span");
    expect(chip?.getAttribute("title")).toBe("Se calcula del inventario de la sección");
  });

  it("pasa ruta y periodo al selector", () => {
    render(<EncabezadoSeccion seccion={seccion} periodo="2026-07" />);
    expect(screen.getByTestId("selector-periodo").textContent)
      .toContain("/panel/dashboard/servicio-general");
    expect(screen.getByTestId("selector-periodo").textContent).toContain("2026-07");
  });

  it("cambia la etiqueta de fuente según el tipo", () => {
    const seccionDoc = { ...seccion, fuente: "documental" as const };
    render(<EncabezadoSeccion seccion={seccionDoc} periodo="2026-08" />);
    expect(screen.getByText(/Fuente: bandeja documental/)).toBeTruthy();
  });

  it("fuente registro", () => {
    const seccionReg = { ...seccion, fuente: "registro" as const };
    render(<EncabezadoSeccion seccion={seccionReg} periodo="2026-08" />);
    expect(screen.getByText(/Fuente: registro manual/)).toBeTruthy();
  });
});