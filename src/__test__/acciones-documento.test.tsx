// src/__test__/acciones-documento.test.tsx
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

// Las Server Actions: solo necesitamos que existan como referencias
vi.mock("../app/panel/bandeja-documental/acciones", () => ({
  derivar: vi.fn(),
  cambiarEstadoDocumento: vi.fn(),
  ajustarPrioridad: vi.fn(),
  envioExterno: vi.fn(),
  adjuntar: vi.fn(),
}));

vi.mock("../app/panel/bandeja-documental/estado", () => ({
  estadoInicial: { estado: "inicial" },
}));

// Iconos: stubs
vi.mock("../app/panel/iconos", () => ({
  IconAlerta: () => <span data-testid="icon-alerta" />,
  IconCheck: () => <span data-testid="icon-check" />,
}));

// Desplegable: reemplazado por un <select> nativo
vi.mock("../components/ui/desplegable", () => ({
  Desplegable: ({
    nombre,
    opciones,
    placeholder,
    valorInicial,
    disabled,
  }: any) => (
    <select
      name={nombre}
      defaultValue={valorInicial ?? ""}
      disabled={disabled}
      data-testid={`select-${nombre}`}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {opciones.map((o: any) => (
        <option key={o.valor} value={o.valor}>
          {o.texto}
        </option>
      ))}
    </select>
  ),
}));

import { AccionesDocumento } from "../app/panel/bandeja-documental/documentos/[id]/AccionesDocumento";

/* ---------------- Fixtures ---------------- */

const documentoBase = {
  id: "001-2026",
  tipo: "Oficio",
  numero: "001-2026",
  asunto: "Solicitud de materiales",
  origen: "Comandancia",
  destino: "Administración",
  seccion: "administracion" as const,
  via: "Digital" as const,
  folios: 2,
  fechaIngreso: "01/01/2026",
  plazo: "15/01/2026",
  estado: "Pendiente" as const,
  prioridad: "Alta" as const,
  prioridadManual: false,
  trazabilidad: [
    { etapa: "Ingreso", fecha: "01/01/2026", hora: "10:00", responsable: "X", detalle: "y", completada: true },
    { etapa: "Clasificación", fecha: "01/01/2026", hora: "10:00", responsable: "X", detalle: "y", completada: true },
  ],
} as any;

const enProceso = { ...documentoBase, estado: "En proceso" as const };

const secciones = [
  { clave: "administracion" as const, nombre: "Administración" },
  { clave: "maquinas" as const, nombre: "Máquinas" },
  { clave: "sanidad" as const, nombre: "Sanidad" },
];

function conEstado(estado: any, pendiente = false) {
  actionStateMock.mockReturnValue([estado, vi.fn(), pendiente]);
}

/* ---------------- Tests ---------------- */

describe("AccionesDocumento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conEstado({ estado: "inicial" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ---------------- Contenedor ---------------- */

  describe("contenedor con pestañas", () => {
    it("renderiza el encabezado", () => {
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      expect(screen.getByText("Gestionar documento")).toBeTruthy();
      expect(screen.getByText(/queda en el historial/)).toBeTruthy();
    });

    it("renderiza las 5 pestañas", () => {
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      expect(screen.getByRole("tab", { name: "Derivar" })).toBeTruthy();
      expect(screen.getByRole("tab", { name: "Cambiar estado" })).toBeTruthy();
      expect(screen.getByRole("tab", { name: "Prioridad" })).toBeTruthy();
      expect(screen.getByRole("tab", { name: "Envío externo" })).toBeTruthy();
      expect(screen.getByRole("tab", { name: "Adjunto" })).toBeTruthy();
    });

    it("arranca con Derivar seleccionada", () => {
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      expect(screen.getByRole("tab", { name: "Derivar" }).getAttribute("aria-selected")).toBe("true");
      expect(screen.getByRole("tab", { name: "Cambiar estado" }).getAttribute("aria-selected")).toBe("false");
    });

    it("cambia de pestaña al pulsar Cambiar estado", () => {
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      fireEvent.click(screen.getByRole("tab", { name: "Cambiar estado" }));
      expect(screen.getByRole("tab", { name: "Cambiar estado" }).getAttribute("aria-selected")).toBe("true");
      expect(screen.getByText(/Nuevo estado/)).toBeTruthy();
    });

    it("cambia a Envío externo", () => {
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      fireEvent.click(screen.getByRole("tab", { name: "Envío externo" }));
      expect(screen.getByText(/El sistema no envía fuera/)).toBeTruthy();
    });

    it("cambia a Adjunto", () => {
      render(<AccionesDocumento documento={enProceso} secciones={secciones} />);
      fireEvent.click(screen.getByRole("tab", { name: "Adjunto" }));
      expect(screen.getByText(/Adjuntar archivo/)).toBeTruthy();
    });
  });

  /* ---------------- Formulario: Derivar ---------------- */

  describe("Derivar", () => {
    it("incluye el id como hidden", () => {
      const { container } = render(
        <AccionesDocumento documento={documentoBase} secciones={secciones} />,
      );
      const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"][name="id"]');
      expect(hidden?.value).toBe("001-2026");
    });

    it("filtra la sección actual de las opciones", () => {
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      const select = screen.getByTestId("select-seccion") as HTMLSelectElement;
      const opciones = Array.from(select.options).map((o) => o.value);
      expect(opciones).not.toContain("administracion");
      expect(opciones).toContain("maquinas");
      expect(opciones).toContain("sanidad");
    });

    it("muestra el botón 'Derivar'", () => {
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      expect(screen.getByRole("button", { name: "Derivar" })).toBeTruthy();
    });

    it("muestra el textarea de nota deshabilitado si pendiente", () => {
      conEstado({ estado: "inicial" }, true);
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      const textarea = screen.getByPlaceholderText(/Para atención/);
      expect((textarea as HTMLTextAreaElement).disabled).toBe(true);
    });

    it("marca el select como inválido si el error apunta a seccion", () => {
      conEstado({ estado: "error", mensaje: "x", campo: "seccion" });
      const { container } = render(
        <AccionesDocumento documento={documentoBase} secciones={secciones} />,
      );
      const campo = container.querySelector('[data-invalido="true"]');
      expect(campo).toBeTruthy();
    });

    it("muestra el mensaje de error cuando el estado es error", () => {
      conEstado({ estado: "error", mensaje: "La sección destino es obligatoria." });
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      expect(screen.getByRole("alert").textContent).toContain("La sección destino es obligatoria.");
    });

    it("muestra el mensaje de éxito cuando el estado es ok", () => {
      conEstado({ estado: "ok", mensaje: "Derivado a Máquinas." });
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      expect(screen.getByRole("status").textContent).toContain("Derivado a Máquinas.");
    });
  });

  /* ---------------- Formulario: CambiarEstado ---------------- */

  describe("CambiarEstado", () => {
    it("solo ofrece pasar a Atendido", () => {
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      fireEvent.click(screen.getByRole("tab", { name: "Cambiar estado" }));
      const select = screen.getByTestId("select-estado") as HTMLSelectElement;
      expect(Array.from(select.options).map((o) => o.value)).toEqual(["Atendido"]);
    });

    it("muestra el botón 'Marcar como atendido'", () => {
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      fireEvent.click(screen.getByRole("tab", { name: "Cambiar estado" }));
      expect(screen.getByRole("button", { name: "Marcar como atendido" })).toBeTruthy();
    });

    it("un documento Atendido no admite cambios manuales (RN-0026)", () => {
      const doc = { ...documentoBase, estado: "Atendido" as const };
      render(<AccionesDocumento documento={doc} secciones={secciones} />);
      fireEvent.click(screen.getByRole("tab", { name: "Cambiar estado" }));
      expect(screen.getByText(/archivará automáticamente/)).toBeTruthy();
      expect(screen.queryByTestId("select-estado")).toBeNull();
    });
  });

  /* ---------------- Formulario: Prioridad ---------------- */

  describe("AjustarPrioridad", () => {
    it("muestra la prioridad y el plazo actuales", () => {
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      fireEvent.click(screen.getByRole("tab", { name: "Prioridad" }));
      expect(screen.getByTestId("select-prioridad")).toBeTruthy();
      expect(screen.getByText("Actual: 15/01/2026")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Guardar prioridad" })).toBeTruthy();
    });
  });

  /* ---------------- Formulario: EnvioExterno ---------------- */

  describe("EnvioExterno", () => {
    it("muestra el formulario si no hay envío previo", () => {
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      fireEvent.click(screen.getByRole("tab", { name: "Envío externo" }));
      expect(screen.getByTestId("select-medio")).toBeTruthy();
      expect(screen.getByPlaceholderText(/CGBVP/)).toBeTruthy();
    });

    it("tiene 'Correo institucional' como valor inicial", () => {
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      fireEvent.click(screen.getByRole("tab", { name: "Envío externo" }));
      const select = screen.getByTestId("select-medio") as HTMLSelectElement;
      expect(select.value).toBe("Correo institucional");
    });

    it("muestra los 4 medios disponibles", () => {
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      fireEvent.click(screen.getByRole("tab", { name: "Envío externo" }));
      const select = screen.getByTestId("select-medio") as HTMLSelectElement;
      const opciones = Array.from(select.options).map((o) => o.value);
      expect(opciones).toEqual([
        "Correo institucional",
        "Mesa de partes",
        "Courier",
        "Entrega en mano",
      ]);
    });

    it("muestra el mensaje de 'ya registrado' si existe envioExterno", () => {
      const doc = {
        ...documentoBase,
        envioExterno: {
          fecha: "10/01/2026",
          hora: "14:30",
          medio: "Courier",
          destinatario: "Municipalidad",
        },
      };
      render(<AccionesDocumento documento={doc} secciones={secciones} />);
      fireEvent.click(screen.getByRole("tab", { name: "Envío externo" }));
      expect(screen.getByText(/ya registrado/)).toBeTruthy();
      expect(screen.getByText(/Municipalidad/)).toBeTruthy();
      // No hay formulario
      expect(screen.queryByTestId("select-medio")).toBeNull();
    });
  });

  /* ---------------- Formulario: Adjuntar ---------------- */

  describe("Adjuntar", () => {
    it("fuera de En proceso no permite reemplazar (RN-0010)", () => {
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      fireEvent.click(screen.getByRole("tab", { name: "Adjunto" }));
      expect(screen.getByText(/solo puede reemplazarse mientras/)).toBeTruthy();
      expect(document.querySelector('input[type="file"]')).toBeNull();
    });

    it("etiqueta 'Adjuntar archivo' si no hay adjunto", () => {
      render(<AccionesDocumento documento={enProceso} secciones={secciones} />);
      fireEvent.click(screen.getByRole("tab", { name: "Adjunto" }));
      expect(screen.getByText(/^Adjuntar archivo$/)).toBeTruthy();
    });

    it("etiqueta 'Reemplazar archivo' si ya hay adjunto", () => {
      const doc = {
        ...enProceso,
        adjunto: { nombre: "viejo.pdf", tamano: "1 KB", actualizado: "01/01/2026" },
      };
      render(<AccionesDocumento documento={doc} secciones={secciones} />);
      fireEvent.click(screen.getByRole("tab", { name: "Adjunto" }));
      expect(screen.getByText(/^Reemplazar archivo$/)).toBeTruthy();
    });

    it("muestra el input file", () => {
      render(<AccionesDocumento documento={enProceso} secciones={secciones} />);
      fireEvent.click(screen.getByRole("tab", { name: "Adjunto" }));
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.accept).toContain("application/pdf");
    });
  });

  /* ---------------- Pie (estado + botón) ---------------- */

  describe("Pie", () => {
    it("muestra 'Guardando…' cuando pendiente", () => {
      conEstado({ estado: "inicial" }, true);
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      expect(screen.getByRole("button", { name: /Guardando/ })).toBeTruthy();
    });

    it("deshabilita el botón cuando pendiente", () => {
      conEstado({ estado: "inicial" }, true);
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      expect((screen.getByRole("button", { name: /Guardando/ }) as HTMLButtonElement).disabled).toBe(true);
    });

    it("renderiza role=status con el mensaje ok", () => {
      conEstado({ estado: "ok", mensaje: "Actualizado." });
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      expect(screen.getByRole("status")).toBeTruthy();
    });

    it("renderiza role=alert con el mensaje error", () => {
      conEstado({ estado: "error", mensaje: "Fallo." });
      render(<AccionesDocumento documento={documentoBase} secciones={secciones} />);
      expect(screen.getByRole("alert")).toBeTruthy();
    });
  });

  /* ---------------- Remontaje por trazabilidad ---------------- */

  describe("remontaje", () => {
    it("al cambiar la trazabilidad del documento se remonta el formulario", () => {
      const { rerender } = render(
        <AccionesDocumento documento={documentoBase} secciones={secciones} />,
      );
      const textareaVieja = screen.getByPlaceholderText(/Para atención/) as HTMLTextAreaElement;
      textareaVieja.value = "nota a medio escribir";

      const docConNuevaEntrada = {
        ...documentoBase,
        trazabilidad: [
          ...documentoBase.trazabilidad,
          { etapa: "Derivación", fecha: "01/01/2026", hora: "11:00", responsable: "X", detalle: "y", completada: true },
        ],
      };
      rerender(<AccionesDocumento documento={docConNuevaEntrada} secciones={secciones} />);

      const textareaNueva = screen.getByPlaceholderText(/Para atención/) as HTMLTextAreaElement;
      expect(textareaNueva.value).toBe("");
    });
  });
});