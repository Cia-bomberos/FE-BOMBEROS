// src/__test__/TablaInventario.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../app/panel/iconos", () => ({
  IconBuscar: () => <span data-testid="icon-buscar" />,
}));

vi.mock("../app/panel/inventario/Etiquetas", () => ({
  EtiquetaEstadoActivo: ({ estado }: any) => (
    <span data-testid="etiqueta-estado">{estado}</span>
  ),
}));

import { TablaInventario } from "../app/panel/inventario/TablaInventario";
import type { Activo } from "../lib/inventario-repo";

const secciones = [
  { clave: "servicio-general" as const, nombre: "Servicio General" },
  { clave: "sanidad" as const, nombre: "Sanidad" },
];

const activo = (extra: Partial<Activo> = {}): Activo =>
  ({
    codigo: "EXT-001",
    descripcion: "Extintor PQS 6kg",
    categoria: "Extintores",
    seccion: "servicio-general",
    ubicacion: "Depósito A",
    cantidad: 5,
    estado: "Operativo",
    ...extra,
  }) as Activo;

const lista: Activo[] = [
  activo({ codigo: "A1", descripcion: "Extintor PQS", categoria: "Equipo", ubicacion: "Depósito A", seccion: "servicio-general" }),
  activo({ codigo: "A2", descripcion: "Botiquín", categoria: "Equipo", ubicacion: "Ambulancia A-1", seccion: "sanidad" }),
  activo({ codigo: "A3", descripcion: "Casco", categoria: "Equipo", ubicacion: "Almacén", seccion: "servicio-general" }),
];

describe("TablaInventario", () => {
  /* ---------------- Render ---------------- */

  it("renderiza el buscador", () => {
    render(<TablaInventario activos={lista} secciones={secciones} />);
    expect(screen.getByLabelText(/Buscar en el inventario/i)).toBeTruthy();
  });

  it("con varias secciones: muestra chips de filtro", () => {
    render(<TablaInventario activos={lista} secciones={secciones} />);
    expect(screen.getByRole("button", { name: "Todas" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Servicio General" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sanidad" })).toBeTruthy();
  });

  it("con una sola sección: no muestra chips", () => {
    render(<TablaInventario activos={lista} secciones={[secciones[0]]} />);
    expect(screen.queryByRole("button", { name: "Todas" })).toBeNull();
  });

  it("renderiza todas las filas", () => {
    render(<TablaInventario activos={lista} secciones={secciones} />);
    expect(screen.getByText("A1")).toBeTruthy();
    expect(screen.getByText("A2")).toBeTruthy();
    expect(screen.getByText("A3")).toBeTruthy();
  });

  it("renderiza las columnas correctas", () => {
    const { container } = render(<TablaInventario activos={lista} secciones={secciones} />);
    const headers = Array.from(container.querySelectorAll("th")).map((th) => th.textContent);
    expect(headers).toEqual([
      "Identificador", "Descripción", "Categoría", "Sección",
      "Ubicación", "Cantidad", "Estado",
    ]);
  });

  it("muestra observaciones como celda secundaria", () => {
    render(
      <TablaInventario
        activos={[activo({ codigo: "A9", observaciones: "Vence 12/2027" })]}
        secciones={secciones}
      />,
    );
    expect(screen.getByText("Vence 12/2027")).toBeTruthy();
  });

  it("sin observaciones no muestra celda secundaria", () => {
    render(
      <TablaInventario
        activos={[activo({ codigo: "A9" })]}
        secciones={secciones}
      />,
    );
    expect(screen.queryByText(/Vence/)).toBeNull();
  });

  it("traduce la sección al nombre legible", () => {
    const { container } = render(<TablaInventario activos={[activo()]} secciones={secciones} />);
    const filas = container.querySelectorAll("tbody tr");
    expect(filas[0].textContent).toContain("Servicio General");
  });

  it("si la sección no está en el catálogo, muestra la clave", () => {
    const { container } = render(
      <TablaInventario
        activos={[activo({ seccion: "otra" as any })]}
        secciones={secciones}
      />,
    );
    expect(container.querySelector("tbody")?.textContent).toContain("otra");
  });

  /* ---------------- Búsqueda ---------------- */

  it("filtra por código", () => {
    render(<TablaInventario activos={lista} secciones={secciones} />);
    fireEvent.change(screen.getByLabelText(/Buscar en el inventario/i), {
      target: { value: "A2" },
    });
    expect(screen.getByText("A2")).toBeTruthy();
    expect(screen.queryByText("A1")).toBeNull();
  });

  it("filtra por descripción", () => {
    render(<TablaInventario activos={lista} secciones={secciones} />);
    fireEvent.change(screen.getByLabelText(/Buscar en el inventario/i), {
      target: { value: "casco" },
    });
    expect(screen.getByText("A3")).toBeTruthy();
    expect(screen.queryByText("A1")).toBeNull();
  });

  it("filtra por categoría", () => {
    render(<TablaInventario activos={lista} secciones={secciones} />);
    fireEvent.change(screen.getByLabelText(/Buscar en el inventario/i), {
      target: { value: "Equipo" },
    });
    expect(screen.getByText("A2")).toBeTruthy();
  });

  it("filtra por ubicación", () => {
    render(<TablaInventario activos={lista} secciones={secciones} />);
    fireEvent.change(screen.getByLabelText(/Buscar en el inventario/i), {
      target: { value: "Ambulancia" },
    });
    expect(screen.getByText("A2")).toBeTruthy();
  });

  it("la búsqueda es case-insensitive", () => {
    render(<TablaInventario activos={lista} secciones={secciones} />);
    fireEvent.change(screen.getByLabelText(/Buscar en el inventario/i), {
      target: { value: "BOTIQUÍN" },
    });
    expect(screen.getByText("A2")).toBeTruthy();
  });

  /* ---------------- Chips de sección ---------------- */

  it("filtrar por sección", () => {
    render(<TablaInventario activos={lista} secciones={secciones} />);
    fireEvent.click(screen.getByRole("button", { name: "Sanidad" }));
    expect(screen.getByText("A2")).toBeTruthy();
    expect(screen.queryByText("A1")).toBeNull();
    expect(screen.queryByText("A3")).toBeNull();
  });

  it("volver a Todas muestra todos", () => {
    render(<TablaInventario activos={lista} secciones={secciones} />);
    fireEvent.click(screen.getByRole("button", { name: "Sanidad" }));
    fireEvent.click(screen.getByRole("button", { name: "Todas" }));
    expect(screen.getByText("A1")).toBeTruthy();
    expect(screen.getByText("A2")).toBeTruthy();
  });

  /* ---------------- Combinaciones ---------------- */

  it("combina búsqueda + sección", () => {
    render(<TablaInventario activos={lista} secciones={secciones} />);
    fireEvent.change(screen.getByLabelText(/Buscar en el inventario/i), {
      target: { value: "Extintor" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sanidad" }));
    expect(screen.getByText(/No se encontraron activos/)).toBeTruthy();
  });

  /* ---------------- Vacío ---------------- */

  it("sin resultados muestra el mensaje de vacío", () => {
    render(<TablaInventario activos={lista} secciones={secciones} />);
    fireEvent.change(screen.getByLabelText(/Buscar en el inventario/i), {
      target: { value: "zzz" },
    });
    expect(screen.getByText(/No se encontraron activos/)).toBeTruthy();
  });

  it("con lista vacía muestra el mensaje de vacío", () => {
    render(<TablaInventario activos={[]} secciones={secciones} />);
    expect(screen.getByText(/No se encontraron activos/)).toBeTruthy();
  });
});