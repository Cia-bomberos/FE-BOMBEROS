// src/__test__/FormularioRegistro.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

// Desplegable controlado: expone onCambio a través de un <select>
vi.mock("@/components/ui/desplegable", () => ({
  Desplegable: ({ nombre, opciones, valor, valorInicial, onCambio, disabled, invalido }: any) => {
    return (
      <select
        data-testid={`select-${nombre}`}
        name={nombre}
        defaultValue={valor ?? valorInicial ?? ""}
        disabled={disabled}
        aria-invalid={invalido || undefined}
        onChange={(e) => onCambio?.(e.target.value)}
      >
        {opciones.map((o: any) => (
          <option key={o.valor} value={o.valor}>{o.texto}</option>
        ))}
      </select>
    );
  },
}));

vi.mock("../app/panel/bandeja-documental/estado", () => ({
  estadoInicial: { estado: "inicial" },
}));

vi.mock("../app/panel/bandeja-documental/acciones", () => ({
  registrar: vi.fn(),
}));

vi.mock("../app/panel/iconos", () => ({
  IconAlerta: () => <span data-testid="icon-alerta" />,
  IconFlecha: () => <span data-testid="icon-flecha" />,
}));

// Mockeamos plazos para controlar diasRestantes
vi.mock("@/lib/plazos", async () => {
  const real = await vi.importActual<any>("@/lib/plazos");
  return {
    ...real,
    diasRestantes: vi.fn(),
    parsearFecha: vi.fn((s) => new Date(2026, 0, 1)),
  };
});

import { FormularioRegistro } from "../app/panel/bandeja-documental/registrar/FormularioRegistro";
import * as plazos from "@/lib/plazos";

const secciones = [
  { clave: "administracion" as const, nombre: "Administración" },
  { clave: "maquinas" as const, nombre: "Máquinas" },
];

function conEstado(estado: any, pendiente = false) {
  actionStateMock.mockReturnValue([estado, vi.fn(), pendiente]);
}

describe("FormularioRegistro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conEstado({ estado: "inicial" });
  });

  afterEach(() => vi.restoreAllMocks());

  /* ---------------- Estructura ---------------- */

  it("renderiza todos los campos", () => {
    render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    expect(screen.getByTestId("select-tipo")).toBeTruthy();
    expect(screen.getByTestId("select-via")).toBeTruthy();
    expect(screen.getByLabelText(/Asunto/i)).toBeTruthy();
    expect(screen.getByLabelText(/Plazo de atención/i)).toBeTruthy();
    expect(screen.getByTestId("select-prioridad")).toBeTruthy();
    expect(screen.getByLabelText(/Archivo digital/i)).toBeTruthy();
  });

  it("el select de tipo ofrece los 7 tipos documentales", () => {
    render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    const select = screen.getByTestId("select-tipo") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual([
      "Oficio", "Nota Informativa", "Informe", "Memorando", "Carta", "Solicitud", "Acta",
    ]);
  });

  it("vía por defecto: Digital", () => {
    render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    expect((screen.getByTestId("select-via") as HTMLSelectElement).value).toBe("Digital");
  });

  /* ---------------- Sección ---------------- */

  it("muestra la sección del usuario como solo lectura", () => {
    render(
      <FormularioRegistro
        secciones={[secciones[0]]}
        hoy="01/01/2026"
      />,
    );
    const campo = screen.getByLabelText("Sección responsable") as HTMLInputElement;
    expect(campo.value).toBe(secciones[0].nombre);
    expect(campo.readOnly).toBe(true);
  });

  it("externo deshabilita el tipo documental (RN-0025)", () => {
    render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    const tipo = screen.getByTestId("select-tipo") as HTMLSelectElement;
    expect(tipo.disabled).toBe(false);
    fireEvent.change(screen.getByTestId("select-procedencia"), { target: { value: "externo" } });
    expect(tipo.disabled).toBe(true);
    expect(screen.getByText(/Registro simplificado/)).toBeTruthy();
  });

  it("el archivo es obligatorio y solo PDF", () => {
    render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    const archivo = screen.getByLabelText(/Archivo digital/) as HTMLInputElement;
    expect(archivo.required).toBe(true);
    expect(archivo.accept).toContain("application/pdf");
  });

  /* ---------------- Prioridad sugerida por plazo ---------------- */

  it("sin plazo no hay sugerencia", () => {
    render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    const select = screen.getByTestId("select-prioridad") as HTMLSelectElement;
    const opcionAuto = Array.from(select.options).find((o) => o.value === "");
    expect(opcionAuto?.textContent).toBe("Automática por plazo");
  });

  it("plazo cercano (< 10 días) sugiere Alta", () => {
    vi.mocked(plazos.diasRestantes).mockReturnValue(5);
    render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    const inputFecha = screen.getByLabelText(/Plazo de atención/i) as HTMLInputElement;
    fireEvent.change(inputFecha, { target: { value: "2026-01-05" } });
    const select = screen.getByTestId("select-prioridad") as HTMLSelectElement;
    const opcionAuto = Array.from(select.options).find((o) => o.value === "");
    expect(opcionAuto?.textContent).toBe("Automática por plazo (Alta)");
  });

  it("plazo medio (10–30 días) sugiere Media", () => {
    vi.mocked(plazos.diasRestantes).mockReturnValue(20);
    render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    fireEvent.change(screen.getByLabelText(/Plazo de atención/i), {
      target: { value: "2026-01-21" },
    });
    const select = screen.getByTestId("select-prioridad") as HTMLSelectElement;
    expect(Array.from(select.options).find((o) => o.value === "")?.textContent)
      .toBe("Automática por plazo (Media)");
  });

  it("plazo lejano (> 30 días) sugiere Baja", () => {
    vi.mocked(plazos.diasRestantes).mockReturnValue(45);
    render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    fireEvent.change(screen.getByLabelText(/Plazo de atención/i), {
      target: { value: "2026-02-15" },
    });
    const select = screen.getByTestId("select-prioridad") as HTMLSelectElement;
    expect(Array.from(select.options).find((o) => o.value === "")?.textContent)
      .toBe("Automática por plazo (Baja)");
  });

  it("días null no sugiere prioridad", () => {
    vi.mocked(plazos.diasRestantes).mockReturnValue(null);
    render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    fireEvent.change(screen.getByLabelText(/Plazo de atención/i), {
      target: { value: "2026-02-15" },
    });
    const select = screen.getByTestId("select-prioridad") as HTMLSelectElement;
    expect(Array.from(select.options).find((o) => o.value === "")?.textContent)
      .toBe("Automática por plazo");
  });

  it("fecha incompleta no sugiere prioridad", () => {
    render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    // Al no escribir en el input, plazo está vacío
    const select = screen.getByTestId("select-prioridad") as HTMLSelectElement;
    expect(Array.from(select.options).find((o) => o.value === "")?.textContent)
      .toBe("Automática por plazo");
  });

  it("parsearFecha null no calcula", () => {
    vi.mocked(plazos.parsearFecha).mockReturnValueOnce(null);
    render(<FormularioRegistro secciones={secciones} hoy="invalida" />);
    fireEvent.change(screen.getByLabelText(/Plazo de atención/i), {
      target: { value: "2026-02-15" },
    });
    const select = screen.getByTestId("select-prioridad") as HTMLSelectElement;
    expect(Array.from(select.options).find((o) => o.value === "")?.textContent)
      .toBe("Automática por plazo");
  });

  /* ---------------- Prioridad manual ---------------- */

  it("permite elegir una prioridad manual", () => {
    render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    const select = screen.getByTestId("select-prioridad") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "Media" } });
    // No rompe el render; el valor se propaga vía onCambio
    expect(select.options).toHaveLength(4);
  });

  /* ---------------- Pendiente ---------------- */

  it("con pendiente deshabilita inputs y botón", () => {
    conEstado({ estado: "inicial" }, true);
    render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    expect((screen.getByLabelText(/Asunto/i) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/Plazo de atención/i) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /Registrando/ })).toHaveProperty("disabled", true);
  });

  /* ---------------- Errores ---------------- */

  it("muestra el error con role=alert", () => {
    conEstado({ estado: "error", mensaje: "Seleccione el tipo.", campo: "tipo" });
    render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    expect(screen.getByRole("alert").textContent).toContain("Seleccione el tipo.");
  });

  it("marca data-invalido en tipo", () => {
    conEstado({ estado: "error", mensaje: "x", campo: "tipo" });
    const { container } = render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    expect(container.querySelector('[data-invalido="true"]')?.textContent).toMatch(/Tipo documental/);
  });

  it("marca data-invalido en asunto", () => {
    conEstado({ estado: "error", mensaje: "x", campo: "asunto" });
    const { container } = render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    expect(container.querySelector('[data-invalido="true"]')?.textContent).toMatch(/Asunto/);
  });

  it("marca data-invalido en plazo", () => {
    conEstado({ estado: "error", mensaje: "x", campo: "plazo" });
    const { container } = render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    expect(container.querySelector('[data-invalido="true"]')?.textContent).toMatch(/Plazo/);
  });

  it("marca data-invalido en procedencia", () => {
    conEstado({ estado: "error", mensaje: "x", campo: "procedencia" });
    const { container } = render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    expect(container.querySelector('[data-invalido="true"]')?.textContent).toMatch(/Procedencia/);
  });

  /* ---------------- Links y botones ---------------- */

  it("Cancelar apunta a /panel/bandeja-documental/documentos", () => {
    render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    expect(screen.getByRole("link", { name: "Cancelar" }).getAttribute("href"))
      .toBe("/panel/bandeja-documental/documentos");
  });

  it("muestra la ayuda de prioridad", () => {
    render(<FormularioRegistro secciones={secciones} hoy="01/01/2026" />);
    expect(screen.getByText(/Alta si vence en menos de 10 días/)).toBeTruthy();
  });
});