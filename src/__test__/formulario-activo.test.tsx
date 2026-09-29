// src/__test__/FormularioActivo.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

/* ---------------- Mocks ---------------- */

const actionStateMock = vi.fn();
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: (...args: any[]) => actionStateMock(...args),
  };
});

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("@/components/ui/desplegable", () => ({
  Desplegable: ({ nombre, opciones, valorInicial, placeholder, disabled, invalido }: any) => (
    <select
      data-testid={`select-${nombre}`}
      name={nombre}
      defaultValue={valorInicial ?? ""}
      disabled={disabled}
      aria-invalid={invalido || undefined}
    >
      {(valorInicial === "" || placeholder) && (
        <option value="">{placeholder ?? "Seleccione…"}</option>
      )}
      {opciones.map((o: any) => (
        <option key={o.valor} value={o.valor}>{o.texto}</option>
      ))}
    </select>
  ),
}));

vi.mock("@/lib/inventario-repo", () => ({
  CATEGORIAS_ACTIVO: ["Extintores", "EPP", "Materiales"],
  ESTADOS_ACTIVO: ["Operativo", "En reparación", "De baja"],
  registrarActivo: vi.fn(),
}));

vi.mock("../app/panel/bandeja-documental/estado", () => ({
  estadoInicial: { estado: "inicial" },
}));

vi.mock("../app/panel/inventario/acciones", () => ({
  registrar: vi.fn(),
}));

vi.mock("../app/panel/iconos", () => ({
  IconAlerta: () => <span data-testid="icon-alerta" />,
  IconFlecha: () => <span data-testid="icon-flecha" />,
}));

import { FormularioActivo } from "../app/panel/inventario/registrar/FormularioActivo";

const secciones = [
  { clave: "servicio-general" as const, nombre: "Servicio General" },
  { clave: "sanidad" as const, nombre: "Sanidad" },
];
const unaSeccion = [{ clave: "sanidad" as const, nombre: "Sanidad" }];

function conEstado(estado: any, pendiente = false) {
  actionStateMock.mockReturnValue([estado, vi.fn(), pendiente]);
}

describe("FormularioActivo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conEstado({ estado: "inicial" });
  });

  afterEach(() => vi.restoreAllMocks());

  /* ---------------- Estructura básica ---------------- */

  it("renderiza todos los campos", () => {
    render(<FormularioActivo secciones={secciones} />);
    expect(screen.getByLabelText(/Descripción/i)).toBeTruthy();
    expect(screen.getByLabelText(/Cantidad/i)).toBeTruthy();
    expect(screen.getByLabelText(/Ubicación/i)).toBeTruthy();
    expect(screen.getByTestId("select-categoria")).toBeTruthy();
    expect(screen.getByTestId("select-seccion")).toBeTruthy();
    expect(screen.getByTestId("select-estado")).toBeTruthy();
    expect(screen.getByLabelText(/Datos adicionales/i)).toBeTruthy();
  });

  it("renderiza el botón de enviar y el de cancelar", () => {
    render(<FormularioActivo secciones={secciones} />);
    expect(screen.getByRole("button", { name: /Registrar activo/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cancelar" })).toBeTruthy();
  });

  it("el link Cancelar apunta a /panel/inventario", () => {
    render(<FormularioActivo secciones={secciones} />);
    expect(screen.getByRole("link", { name: "Cancelar" }).getAttribute("href"))
      .toBe("/panel/inventario");
  });

  /* ---------------- Catálogos ---------------- */

  it("el selector de categoría ofrece las CATEGORIAS_ACTIVO", () => {
    render(<FormularioActivo secciones={secciones} />);
    const select = screen.getByTestId("select-categoria") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual([
      "Extintores", "EPP", "Materiales",
    ]);
  });

  it("el selector de estado ofrece los ESTADOS_ACTIVO y arranca en Operativo", () => {
    render(<FormularioActivo secciones={secciones} />);
    const select = screen.getByTestId("select-estado") as HTMLSelectElement;
    expect(select.value).toBe("Operativo");
    expect(Array.from(select.options).map((o) => o.value)).toEqual([
      "Operativo", "En reparación", "De baja",
    ]);
  });

  /* ---------------- Secciones ---------------- */

  it("con varias secciones: selector habilitado y sin valor inicial", () => {
    render(<FormularioActivo secciones={secciones} />);
    const select = screen.getByTestId("select-seccion") as HTMLSelectElement;
    expect(select.disabled).toBe(false);
    expect(select.value).toBe("");
  });

  it("con una sola sección: valor inicial y deshabilitado", () => {
    render(<FormularioActivo secciones={unaSeccion} />);
    const select = screen.getByTestId("select-seccion") as HTMLSelectElement;
    expect(select.value).toBe("sanidad");
    expect(select.disabled).toBe(true);
  });

  it("muestra el texto de ayuda bajo el selector de sección", () => {
    render(<FormularioActivo secciones={secciones} />);
    expect(screen.getByText(/El identificador único se asigna/)).toBeTruthy();
  });

  /* ---------------- Pendiente ---------------- */

  it("con pendiente deshabilita inputs y botón", () => {
    conEstado({ estado: "inicial" }, true);
    render(<FormularioActivo secciones={secciones} />);

    expect((screen.getByLabelText(/Descripción/i) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/Cantidad/i) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/Ubicación/i) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId("select-categoria") as HTMLSelectElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /Registrando/ })).toHaveProperty("disabled", true);
  });

  /* ---------------- Errores ---------------- */

  it("muestra el mensaje de error con role=alert", () => {
    conEstado({ estado: "error", mensaje: "Indique la cantidad.", campo: "cantidad" });
    render(<FormularioActivo secciones={secciones} />);
    expect(screen.getByRole("alert").textContent).toContain("Indique la cantidad.");
  });

  it("marca data-invalido en descripcion", () => {
    conEstado({ estado: "error", mensaje: "x", campo: "descripcion" });
    const { container } = render(<FormularioActivo secciones={secciones} />);
    const invalid = container.querySelector('[data-invalido="true"]');
    expect(invalid?.textContent).toMatch(/Descripción/);
  });

  it("marca data-invalido en categoria", () => {
    conEstado({ estado: "error", mensaje: "x", campo: "categoria" });
    const { container } = render(<FormularioActivo secciones={secciones} />);
    const invalid = container.querySelector('[data-invalido="true"]');
    expect(invalid?.textContent).toMatch(/Categoría/);
  });

  it("marca data-invalido en seccion", () => {
    conEstado({ estado: "error", mensaje: "x", campo: "seccion" });
    const { container } = render(<FormularioActivo secciones={secciones} />);
    const invalid = container.querySelector('[data-invalido="true"]');
    expect(invalid?.textContent).toMatch(/Sección responsable/);
  });

  it("marca data-invalido en estado", () => {
    conEstado({ estado: "error", mensaje: "x", campo: "estado" });
    const { container } = render(<FormularioActivo secciones={secciones} />);
    const invalid = container.querySelector('[data-invalido="true"]');
    expect(invalid?.textContent).toMatch(/Estado/);
  });

  it("marca data-invalido en observaciones", () => {
    conEstado({ estado: "error", mensaje: "x", campo: "observaciones" });
    const { container } = render(<FormularioActivo secciones={secciones} />);
    const invalid = container.querySelector('[data-invalido="true"]');
    expect(invalid?.textContent).toMatch(/Datos adicionales/);
  });

  it("en estado ok no muestra alert", () => {
    conEstado({ estado: "ok", mensaje: "Creado." });
    render(<FormularioActivo secciones={secciones} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  /* ---------------- Cantidad por defecto ---------------- */

  it("el campo cantidad arranca en 1", () => {
    render(<FormularioActivo secciones={secciones} />);
    expect((screen.getByLabelText(/Cantidad/i) as HTMLInputElement).value).toBe("1");
  });

  it("acepta escribir en la cantidad", () => {
    render(<FormularioActivo secciones={secciones} />);
    const input = screen.getByLabelText(/Cantidad/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "5" } });
    expect(input.value).toBe("5");
  });
});