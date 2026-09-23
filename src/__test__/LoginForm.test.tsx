import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { LoginForm } from "../app/login/LoginForm";

// Mock de Next.js App Router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock de la acción de React (useActionState)
let mockEstado: Record<string, unknown> = { estado: "inicial" };
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: () => [mockEstado, vi.fn(), false],
  };
});

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEstado = { estado: "inicial" };
  });

  it("debe renderizar el formulario inicial de acceso restringido", () => {
    render(<LoginForm />);

    expect(screen.getByText("Acceso restringido")).toBeInTheDocument();
    expect(screen.getByLabelText("Usuario")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ingresar al sistema" })
    ).toBeInTheDocument();
  });

  it("debe alternar la visibilidad de la contraseña al hacer clic en el botón de la clave", () => {
    render(<LoginForm />);

    const inputClave = screen.getByLabelText("Contraseña") as HTMLInputElement;
    const botonOcultar = screen.getByRole("button", { name: "Mostrar contraseña" });

    expect(inputClave.type).toBe("password");

    fireEvent.click(botonOcultar);
    expect(inputClave.type).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(inputClave.type).toBe("password");
  });

  it("debe mostrar la alerta de Bloq Mayús cuando se activa la tecla CapsLock", () => {
    render(<LoginForm />);

    const inputClave = screen.getByLabelText("Contraseña");

    fireEvent.keyDown(inputClave, {
      getModifierState: (key: string) => key === "CapsLock",
    });

    expect(screen.getByText("Bloq Mayús activado")).toBeInTheDocument();
  });

  it("debe renderizar la vista de primer ingreso cuando estado es 'nueva-clave'", () => {
    mockEstado = { estado: "nueva-clave" };
    render(<LoginForm />);

    expect(screen.getByText("Primer ingreso")).toBeInTheDocument();
    expect(screen.getByLabelText("Nueva contraseña")).toBeInTheDocument();
    expect(screen.getByLabelText("Repita la contraseña")).toBeInTheDocument();
  });

  it("debe mostrar el estado de 'Acceso concedido' correctamente", () => {
    mockEstado = {
      estado: "concedido",
      grado: "Teniente",
      nombre: "Juan Perez",
    };
    render(<LoginForm />);

    expect(screen.getByText("Acceso concedido")).toBeInTheDocument();
    expect(screen.getByText("Juan Perez")).toBeInTheDocument();
  });
});