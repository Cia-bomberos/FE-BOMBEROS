// src/__test__/formulario-password.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mocks
const actionStateMock = vi.fn();
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: (...args: any[]) => actionStateMock(...args),
  };
});

vi.mock("../app/panel/cuentas/acciones", () => ({
  cambiarPassword: vi.fn(),
  cambiarUsername: vi.fn(),
}));

vi.mock("../app/panel/bandeja-documental/estado", () => ({
  estadoInicial: { estado: "inicial" },
}));

vi.mock("../app/panel/iconos", () => ({
  IconAlerta: () => <span data-testid="icon-alerta" />,
  IconCheck: () => <span data-testid="icon-check" />,
}));

import { FormularioCuenta } from "../app/panel/cuentas/FormularioPassword";

const cuentaBase = {
  username: "jefe.administracion",
  nombre: "Jefe de Administración",
  grupo: "Jefe_Administracion",
  estado: "CONFIRMED",
} as any;

function conEstado(estado: any, pendiente = false) {
  actionStateMock.mockReturnValue([estado, vi.fn(), pendiente]);
}

describe("FormularioCuenta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conEstado({ estado: "inicial" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra el nombre y username · estado traducido", () => {
    render(<FormularioCuenta cuenta={cuentaBase} />);
    expect(screen.getByText("Jefe de Administración")).toBeTruthy();
    expect(screen.getByText(/jefe.administracion · activa/)).toBeTruthy();
  });

  it("si falta nombre, usa username como título", () => {
    render(<FormularioCuenta cuenta={{ ...cuentaBase, nombre: null }} />);
    expect(screen.getByRole("heading", { name: "jefe.administracion" })).toBeTruthy();
  });

  it("arranca cerrado con el botón 'Editar cuenta…'", () => {
    render(<FormularioCuenta cuenta={cuentaBase} />);
    expect(screen.getByRole("button", { name: "Editar cuenta…" })).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull(); // No hay inputs
  });

  it("abre el formulario al pulsar el botón", () => {
    render(<FormularioCuenta cuenta={cuentaBase} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar cuenta…" }));
    
    expect(screen.getByLabelText(/Nuevo nombre de usuario/)).toBeTruthy();
    expect(screen.getByLabelText(/Nueva contraseña/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeTruthy();
  });

  it("cancelar cierra el formulario", () => {
    render(<FormularioCuenta cuenta={cuentaBase} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar cuenta…" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    
    expect(screen.queryByLabelText(/Nuevo nombre de usuario/)).toBeNull();
  });

  it("incluye hidden con username y grupo", () => {
    const { container } = render(<FormularioCuenta cuenta={cuentaBase} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar cuenta…" }));
    
    const hiddenUser = container.querySelector<HTMLInputElement>('input[type="hidden"][name="username"]');
    const hiddenGroup = container.querySelector<HTMLInputElement>('input[type="hidden"][name="grupo"]');
    
    expect(hiddenUser?.value).toBe("jefe.administracion");
    expect(hiddenGroup?.value).toBe("Jefe_Administracion");
  });

  it("con pendiente deshabilita inputs y botones", () => {
    conEstado({ estado: "inicial" }, true);
    render(<FormularioCuenta cuenta={cuentaBase} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar cuenta…" }));
    
    const inputUser = screen.getByLabelText(/Nuevo nombre de usuario/) as HTMLInputElement;
    const inputPass = screen.getByLabelText(/Nueva contraseña/) as HTMLInputElement;
    const btnSubmit = screen.getByRole("button", { name: /Guardando/ }) as HTMLButtonElement;
    
    expect(inputUser.disabled).toBe(true);
    expect(inputPass.disabled).toBe(true);
    expect(btnSubmit.disabled).toBe(true);
  });

  it("muestra el mensaje de error con role=alert", () => {
    conEstado({ estado: "error", mensaje: "Error al guardar." });
    render(<FormularioCuenta cuenta={cuentaBase} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar cuenta…" }));
    
    expect(screen.getByRole("alert").textContent).toContain("Error al guardar.");
  });

  it("marca data-invalido en 'nuevo_username' cuando el error lo apunta", () => {
    conEstado({ estado: "error", mensaje: "Inválido", campo: "nuevo_username-jefe.administracion" });
    render(<FormularioCuenta cuenta={cuentaBase} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar cuenta…" }));
    
    const campo = screen.getByLabelText(/Nuevo nombre de usuario/).closest('[data-invalido="true"]');
    expect(campo).toBeTruthy();
  });

  it("marca data-invalido en 'nueva_password' cuando el error lo apunta", () => {
    conEstado({ estado: "error", mensaje: "Inválido", campo: "nueva_password-jefe.administracion" });
    render(<FormularioCuenta cuenta={cuentaBase} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar cuenta…" }));
    
    const campo = screen.getByLabelText(/Nueva contraseña/).closest('[data-invalido="true"]');
    expect(campo).toBeTruthy();
  });

  it("al pasar a ok cierra el formulario y muestra el mensaje de éxito", () => {
    const { rerender } = render(<FormularioCuenta cuenta={cuentaBase} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar cuenta…" }));
    
    // Simulamos que la acción terminó en ok
    conEstado({ estado: "ok", mensaje: "Cuenta actualizada." });
    rerender(<FormularioCuenta cuenta={cuentaBase} />);
    
    expect(screen.queryByLabelText(/Nuevo nombre de usuario/)).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Cuenta actualizada.");
  });
});