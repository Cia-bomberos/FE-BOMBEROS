// src/__test__/formulario-drive.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock de useActionState para controlar el estado del form
const actionStateMock = vi.fn();
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: (...args: any[]) => actionStateMock(...args),
  };
});

vi.mock("../../configuracion/actions", () => ({
  actualizarDriveAction: vi.fn(),
}));

import { FormularioDrive } from "../app/panel/configuracion/drive/FormularioDrive";

const configBase = {
  enlace: null,
  carpeta_nombre: null,
  cuenta_respaldo: null,
};

describe("FormularioDrive", () => {
  it("renderiza el formulario vacío si no hay config", () => {
    actionStateMock.mockReturnValue([{ estado: "inicial" }, vi.fn(), false]);
    render(<FormularioDrive configInicial={configBase} />);
    
    expect(screen.getByRole("heading", { name: "Configuración de Google Drive" })).toBeTruthy();
    // Buscamos el input por su atributo name, ya que la etiqueta es un <span>
    const input = document.querySelector('input[name="enlace"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe("");
  });

  it("muestra la configuración actual si ya existe", () => {
    actionStateMock.mockReturnValue([{ estado: "inicial" }, vi.fn(), false]);
    render(
      <FormularioDrive 
        configInicial={{ 
          enlace: "https://drive.google.com/...", 
          carpeta_nombre: "Carpeta QA", 
          cuenta_respaldo: "respaldo@bomberos.com" 
        }} 
      />
    );
    
    expect(screen.getByText(/Carpeta QA/)).toBeTruthy();
    expect(screen.getByText(/respaldo@bomberos.com/)).toBeTruthy();
    const input = document.querySelector('input[name="enlace"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe("https://drive.google.com/...");
  });

  it("deshabilita el botón si está pendiente", () => {
    actionStateMock.mockReturnValue([{ estado: "inicial" }, vi.fn(), true]);
    render(<FormularioDrive configInicial={configBase} />);
    
    expect((screen.getByRole("button", { name: /Guardando/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("muestra error si la acción falla", () => {
    actionStateMock.mockReturnValue([{ estado: "error", mensaje: "Fallo" }, vi.fn(), false]);
    render(<FormularioDrive configInicial={configBase} />);
    
    expect(screen.getByRole("alert").textContent).toContain("Fallo");
  });

  it("muestra mensaje de éxito", () => {
    actionStateMock.mockReturnValue([{ estado: "ok", mensaje: "Guardado" }, vi.fn(), false]);
    render(<FormularioDrive configInicial={configBase} />);
    
    expect(screen.getByRole("status").textContent).toContain("Guardado");
  });
});