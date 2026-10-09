import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useEnvioPdf } from "../app/panel/bandeja-documental/envio-pdf";
import type { EstadoAccion } from "../app/panel/bandeja-documental/estado";

const MB = 1024 * 1024;

/** PDF con el tamaño pedido sin reservar la memoria. */
function pdf(size: number) {
  const archivo = new File(["%PDF-1.7"], "oficio.pdf", { type: "application/pdf" });
  return Object.defineProperty(archivo, "size", { value: size });
}

function Formulario({
  estado = { estado: "inicial" },
  enviar,
}: Readonly<{ estado?: EstadoAccion; enviar: (formData: FormData) => void }>) {
  const { estado: visible, alEnviar, limpiarAviso } = useEnvioPdf(estado, enviar);
  return (
    <form onSubmit={alEnviar} data-testid="form">
      <input name="asunto" defaultValue="Asunto de prueba" />
      <input name="archivo" type="file" data-testid="archivo" onChange={limpiarAviso} />
      {visible.estado === "error" && (
        <p role="alert" data-campo={visible.campo}>{visible.mensaje}</p>
      )}
    </form>
  );
}

function adjuntar(size: number) {
  fireEvent.change(screen.getByTestId("archivo"), { target: { files: [pdf(size)] } });
}

describe("useEnvioPdf", () => {
  it("con un PDF de más de 20 MB no envía y avisa en el campo archivo", () => {
    const enviar = vi.fn();
    render(<Formulario enviar={enviar} />);
    adjuntar(25 * MB);
    fireEvent.submit(screen.getByTestId("form"));

    expect(enviar).not.toHaveBeenCalled();
    const alerta = screen.getByRole("alert");
    expect(alerta.textContent).toBe("El archivo supera los 20 MB permitidos.");
    expect(alerta.dataset.campo).toBe("archivo");
  });

  it("con un PDF de hasta 20 MB envía el formulario", () => {
    const enviar = vi.fn();
    render(<Formulario enviar={enviar} />);
    adjuntar(20 * MB);
    fireEvent.submit(screen.getByTestId("form"));

    expect(enviar).toHaveBeenCalledTimes(1);
    const formData = enviar.mock.calls[0][0] as FormData;
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("asunto")).toBe("Asunto de prueba");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("sin archivo envía igual: el servidor pide el PDF", () => {
    const enviar = vi.fn();
    render(<Formulario enviar={enviar} />);
    fireEvent.submit(screen.getByTestId("form"));
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it("evita el envío nativo del formulario", () => {
    render(<Formulario enviar={vi.fn()} />);
    const evento = new Event("submit", { bubbles: true, cancelable: true });
    screen.getByTestId("form").dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
  });

  it("elegir otro archivo quita el aviso", () => {
    render(<Formulario enviar={vi.fn()} />);
    adjuntar(25 * MB);
    fireEvent.submit(screen.getByTestId("form"));
    expect(screen.getByRole("alert")).toBeTruthy();

    adjuntar(1 * MB);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("tras el aviso, un archivo válido sí se envía", () => {
    const enviar = vi.fn();
    render(<Formulario enviar={enviar} />);
    adjuntar(25 * MB);
    fireEvent.submit(screen.getByTestId("form"));
    adjuntar(2 * MB);
    fireEvent.submit(screen.getByTestId("form"));

    expect(enviar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("sin aviso devuelve el estado de la Server Action", () => {
    render(
      <Formulario
        enviar={vi.fn()}
        estado={{ estado: "error", mensaje: "Indique el plazo de atención.", campo: "plazo" }}
      />,
    );
    const alerta = screen.getByRole("alert");
    expect(alerta.textContent).toBe("Indique el plazo de atención.");
    expect(alerta.dataset.campo).toBe("plazo");
  });

  it("el aviso local tiene prioridad sobre el error previo del servidor", () => {
    render(
      <Formulario
        enviar={vi.fn()}
        estado={{ estado: "error", mensaje: "Indique el plazo de atención.", campo: "plazo" }}
      />,
    );
    adjuntar(25 * MB);
    fireEvent.submit(screen.getByTestId("form"));
    expect(screen.getByRole("alert").textContent).toBe("El archivo supera los 20 MB permitidos.");
  });
});
