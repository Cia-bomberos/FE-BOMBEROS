import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { LoginForm } from "../app/login/LoginForm";

// Mock del router de Next.js
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
    prefetch: vi.fn(),
  }),
}));

// Mock del Server Action solicitarAcceso
vi.mock("./actions", () => ({
  solicitarAcceso: vi.fn(),
}));

// Mock de React useActionState
let mockEstadoAction = { estado: "inicial" };
let mockPendiente = false;

vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    useActionState: (action: any, initialState: any) => {
      return [mockEstadoAction, action, mockPendiente];
    },
  };
});

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEstadoAction = { estado: "inicial" };
    mockPendiente = false;
  });

  it("debe renderizar la vista de inicio de sesión por defecto", () => {
    render(<LoginForm />);

    expect(
      screen.getByRole("heading", { name: /Sistema de gestión/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Ingresar al sistema/i })
    ).toBeInTheDocument();
  });

  it("debe permitir alternar la visibilidad de la contraseña", async () => {
    render(<LoginForm />);

    const claveInput = screen.getByLabelText(/Contraseña/i);
    const toggleBtn = screen.getByRole("button", { name: /Mostrar contraseña/i });

    expect(claveInput).toHaveAttribute("type", "password");

    fireEvent.click(toggleBtn);
    expect(claveInput).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: /Ocultar contraseña/i })
    ).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(claveInput).toHaveAttribute("type", "password");
  });

  it("debe detectar la tecla Bloq Mayús (CapsLock) activa", () => {
    render(<LoginForm />);

    const claveInput = screen.getByLabelText(/Contraseña/i);

    fireEvent.keyDown(claveInput, {
      key: "A",
      getModifierState: (key: string) => key === "CapsLock",
    });

    expect(screen.getByText(/Bloq Mayús activado/i)).toBeInTheDocument();

    fireEvent.blur(claveInput);
    expect(screen.queryByText(/Bloq Mayús activado/i)).not.toBeInTheDocument();
  });

  it("debe mostrar mensajes de error cuando el estado devuelva un error", () => {
    mockEstadoAction = {
      estado: "error",
      campo: "clave",
      mensaje: "Credenciales inválidas",
    } as any;

    render(<LoginForm />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Credenciales inválidas");

    const claveInput = screen.getByLabelText(/Contraseña/i);
    expect(claveInput).toHaveAttribute("aria-invalid", "true");
  });

  it("debe redirigir a /panel cuando el acceso sea concedido", async () => {
    mockEstadoAction = { estado: "concedido" } as any;

    render(<LoginForm />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/panel");
    });
  });

  it("debe mostrar el flujo de 'Primer ingreso' cuando el estado sea nueva-clave", () => {
    mockEstadoAction = { estado: "nueva-clave" } as any;

    render(<LoginForm />);

    expect(
      screen.getByRole("heading", { name: /Establezca su/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Nueva contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Repita la contraseña/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Activar cuenta e ingresar/i })
    ).toBeInTheDocument();
  });

  it("debe deshabilitar los campos e indicar carga durante el envío", () => {
    mockPendiente = true;

    render(<LoginForm />);

    expect(screen.getByLabelText(/Usuario/i)).toBeDisabled();
    expect(screen.getByLabelText(/Contraseña/i)).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Ingresando al sistema/i })
    ).toBeDisabled();
  });
});