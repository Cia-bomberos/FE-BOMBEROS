// desplegable.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Desplegable } from "../components/ui/desplegable";

const opciones = [
  { valor: "a", texto: "Opción A" },
  { valor: "b", texto: "Opción B", grupo: "Grupo 1" },
  { valor: "c", texto: "Opción C", grupo: "Grupo 1" },
];

describe("Desplegable", () => {
  it("muestra el placeholder si no hay valor", () => {
    render(<Desplegable opciones={opciones} />);
    expect(screen.getByRole("combobox").textContent).toContain("Seleccione");
  });

  it("abre la lista al hacer clic", () => {
    render(<Desplegable opciones={opciones} />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeTruthy();
  });

  it("selecciona una opción no controlada", () => {
    const onCambio = vi.fn();
    render(<Desplegable opciones={opciones} onCambio={onCambio} />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Opción A"));
    expect(onCambio).toHaveBeenCalledWith("a");
  });

  it("navega con flechas y Enter", () => {
    const onCambio = vi.fn();
    render(<Desplegable opciones={opciones} onCambio={onCambio} />);
    const boton = screen.getByRole("combobox");
    fireEvent.keyDown(boton, { key: "ArrowDown" }); // abre
    fireEvent.keyDown(boton, { key: "ArrowDown" }); // mueve
    fireEvent.keyDown(boton, { key: "Enter" });
    expect(onCambio).toHaveBeenCalled();
  });

  it("Escape cierra", () => {
    render(<Desplegable opciones={opciones} />);
    const boton = screen.getByRole("combobox");
    fireEvent.keyDown(boton, { key: "Enter" });
    fireEvent.keyDown(boton, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("no abre si disabled", () => {
    render(<Desplegable opciones={opciones} disabled />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("incluye input hidden con nombre", () => {
    const { container } = render(
      <Desplegable opciones={opciones} nombre="miCampo" valorInicial="b" />,
    );
    const hidden = container.querySelector<HTMLInputElement>("input[type=hidden]");
    expect(hidden?.value).toBe("b");
  });
});