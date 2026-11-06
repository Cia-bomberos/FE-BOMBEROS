// src/__test__/selector-archivo.test.tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SelectorArchivo } from "../components/ui/selector-archivo";

const pdf = (nombre: string) => new File(["%PDF"], nombre, { type: "application/pdf" });

function montar(props: Partial<React.ComponentProps<typeof SelectorArchivo>> = {}) {
  const onCambio = vi.fn();
  render(<SelectorArchivo nombre="archivo" etiqueta="Adjunto" onCambio={onCambio} {...props} />);
  return { onCambio, campo: screen.getByLabelText("Adjunto") as HTMLInputElement };
}

describe("SelectorArchivo", () => {
  afterEach(cleanup);

  it("muestra los textos en español aunque el navegador esté en otro idioma", () => {
    const { campo } = montar();
    expect(screen.getByText("Elegir archivo")).toBeTruthy();
    expect(screen.getByText("Ningún archivo seleccionado")).toBeTruthy();
    // Reemplaza al "No file chosen" que el navegador muestra al pasar el mouse.
    expect(campo.title).toBe("Ningún archivo seleccionado");
  });

  it("sigue siendo un campo de archivo real del formulario", () => {
    const { campo } = montar({ aceptar: ".pdf", required: true });
    expect(campo.type).toBe("file");
    expect(campo.name).toBe("archivo");
    expect(campo.accept).toBe(".pdf");
    expect(campo.required).toBe(true);
  });

  it("muestra el archivo elegido y avisa del cambio", () => {
    const { campo, onCambio } = montar();
    fireEvent.change(campo, { target: { files: [pdf("oficio.pdf")] } });

    expect(screen.getByText("oficio.pdf")).toBeTruthy();
    expect(screen.queryByText("Ningún archivo seleccionado")).toBeNull();
    expect(campo.title).toBe("oficio.pdf");
    expect(onCambio).toHaveBeenCalledOnce();
  });

  it("vuelve al estado vacío si se cancela la selección", () => {
    const { campo } = montar();
    fireEvent.change(campo, { target: { files: [pdf("oficio.pdf")] } });
    fireEvent.change(campo, { target: { files: [] } });
    expect(screen.getByText("Ningún archivo seleccionado")).toBeTruthy();
  });

  it("marca el error y el estado deshabilitado en el campo", () => {
    const { campo } = montar({ invalido: true, disabled: true });
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(campo.disabled).toBe(true);
  });
});
