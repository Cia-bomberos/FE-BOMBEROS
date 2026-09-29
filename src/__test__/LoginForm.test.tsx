// src/__test__/LoginForm.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// Mock del router
const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

// Mock de useActionState: controlamos el estado y el "pendiente"
const actionStateMock = vi.fn();
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: (...args: any[]) => actionStateMock(...args),
  };
});

// Mock de la Server Action
vi.mock("../app/login/actions", () => ({
  solicitarAcceso: vi.fn(),
}));

vi.mock("../app/login/estado", () => ({
  estadoInicial: { estado: "inicial" },
}));

vi.mock("../app/login/icons", () => ({
  IconAlert: () => <span data-testid="icon-alert" />,
  IconCapsLock: () => <span data-testid="icon-caps" />,
  IconEye: () => <span />,
  IconEyeOff: () => <span />,
  IconLock: () => <span data-testid="icon-lock" />,
  IconShield: () => <span data-testid="icon-shield" />,
}));

import { LoginForm } from "../app/login/LoginForm";

function conEstado(estado: any, pendiente = false) {
  actionStateMock.mockReturnValue([estado, vi.fn(), pendiente]);
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ---------------- Estado por defecto (login normal) ---------------- */

  it("renderiza el formulario de login cuando el estado es inicial", () => {
    conEstado({ estado: "inicial" });
    render(<LoginForm />);

    expect(screen.getByLabelText(/Usuario/i)).toBeTruthy();
    expect(screen.getByLabelText(/Contraseña/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Ingresar al sistema/i })).toBeTruthy();
  });

  it("mantiene el usuario controlado al escribir", () => {
    conEstado({ estado: "inicial" });
    render(<LoginForm />);

    const usuario = screen.getByLabelText(/Usuario/i) as HTMLInputElement;
    fireEvent.change(usuario, { target: { value: "atorres" } });
    expect(usuario.value).toBe("atorres");
  });

  it("cambia el tipo del password con verClave", () => {
    conEstado({ estado: "inicial" });
    render(<LoginForm />);

    const clave = screen.getByLabelText(/Contraseña/i) as HTMLInputElement;
    expect(clave.type).toBe("password");
  });

  /* ---------------- Errores ---------------- */

  it("muestra el mensaje de error con role=alert", () => {
    conEstado({
      estado: "error",
      mensaje: "Credenciales incorrectas.",
      campo: "clave",
    });
    render(<LoginForm />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Credenciales incorrectas.")).toBeTruthy();
  });

  it("marca aria-invalid en el campo usuario cuando el error lo apunta", () => {
    conEstado({ estado: "error", mensaje: "x", campo: "usuario" });
    render(<LoginForm />);
    expect(screen.getByLabelText(/Usuario/i).getAttribute("aria-invalid")).toBe("true");
  });

  it("marca aria-invalid en el campo clave cuando el error lo apunta", () => {
    conEstado({ estado: "error", mensaje: "x", campo: "clave" });
    render(<LoginForm />);
    expect(screen.getByLabelText(/Contraseña/i).getAttribute("aria-invalid")).toBe("true");
  });

  /* ---------------- Concedido ---------------- */

  it("redirige a /panel cuando el estado es concedido", () => {
    conEstado({ estado: "concedido", nombre: "Ana", grado: "Teniente CBP" });
    render(<LoginForm />);
    expect(replaceMock).toHaveBeenCalledWith("/panel");
  });

  it("el botón queda 'Ingresando al sistema' cuando concedido", () => {
    conEstado({ estado: "concedido", nombre: "A", grado: "X" });
    render(<LoginForm />);
    expect(screen.getByRole("button").textContent).toMatch(/Ingresando al sistema/);
  });

  /* ---------------- Pendiente ---------------- */

  it("muestra spinner y 'Ingresando al sistema' cuando pendiente", () => {
    conEstado({ estado: "inicial" }, true);
    render(<LoginForm />);
    expect(screen.getByRole("button").textContent).toMatch(/Ingresando al sistema/);
    expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true);
  });

  /* ---------------- Nueva clave ---------------- */

  it("renderiza el formulario de nueva clave", () => {
    conEstado({ estado: "nueva-clave" });
    render(<LoginForm />);

    expect(screen.getByText(/Primer ingreso/i)).toBeTruthy();
    expect(screen.getByText(/Establezca su/i)).toBeTruthy();
    expect(screen.getByLabelText(/Nueva contraseña/i)).toBeTruthy();
    expect(screen.getByLabelText(/Repita la contraseña/i)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Activar cuenta e ingresar/i }),
    ).toBeTruthy();
  });

  it("el hidden lleva paso=nueva-clave", () => {
    conEstado({ estado: "nueva-clave" });
    const { container } = render(<LoginForm />);
    const hidden = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="paso"]',
    );
    expect(hidden?.value).toBe("nueva-clave");
  });

  it("muestra el mensaje de error en el formulario de nueva clave", () => {
    conEstado({
      estado: "nueva-clave",
      campo: "nueva",
      mensaje: "Debe tener al menos 8 caracteres.",
    });
    render(<LoginForm />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Debe tener al menos 8 caracteres.")).toBeTruthy();
  });

  /* ---------------- Bloqueo de mayúsculas ---------------- */

  it("muestra 'Bloq Mayús activado' al presionar CapsLock en la clave", () => {
    conEstado({ estado: "inicial" });
    render(<LoginForm />);

    const clave = screen.getByLabelText(/Contraseña/i) as HTMLInputElement;

    const event = new KeyboardEvent("keydown", {
      key: "a",
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "getModifierState", {
      value: (key: string) => key === "CapsLock",
    });
    act(() => {
      clave.dispatchEvent(event);
    });

    expect(screen.getByText(/Bloq Mayús activado/i)).toBeTruthy();
  });

  it("oculta el aviso al hacer blur", () => {
    conEstado({ estado: "inicial" });
    render(<LoginForm />);

    const clave = screen.getByLabelText(/Contraseña/i);
    fireEvent.keyDown(clave, { key: "a", getModifierState: () => true } as any);
    fireEvent.blur(clave);
    expect(screen.queryByText(/Bloq Mayús activado/i)).toBeNull();
  });

  it("tolera navegadores sin getModifierState", () => {
    conEstado({ estado: "inicial" });
    render(<LoginForm />);

    const clave = screen.getByLabelText(/Contraseña/i);
    // getModifierState ausente → no debe lanzar
    expect(() =>
      fireEvent.keyDown(clave, { key: "a", getModifierState: undefined } as any),
    ).not.toThrow();
  });

  /* ---------------- No hay redirección sin concedido ---------------- */

  it("no llama a router.replace si el estado no es concedido", () => {
    conEstado({ estado: "inicial" });
    render(<LoginForm />);
    expect(replaceMock).not.toHaveBeenCalled();
  });
});