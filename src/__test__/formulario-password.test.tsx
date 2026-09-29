// src/__test__/FormularioPassword.test.tsx
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

vi.mock("../app/panel/cuentas/acciones", () => ({
  cambiarPassword: vi.fn(),
}));

vi.mock("../app/panel/bandeja-documental/estado", () => ({
  estadoInicial: { estado: "inicial" },
}));

vi.mock("../app/panel/iconos", () => ({
  IconAlerta: () => <span data-testid="icon-alerta" />,
  IconCheck: () => <span data-testid="icon-check" />,
}));

import { FormularioPassword } from "../app/panel/cuentas/FormularioPassword";
import type { CuentaCompartida } from "../lib/cuentas-api";

const cuenta = (extra: Partial<CuentaCompartida> = {}): CuentaCompartida =>
  ({
    username: "comandancia",
    nombre: "Comandancia",
    grupo: "Comandancia" as any,
    estado: "CONFIRMED",
    ...extra,
  });

function conEstado(estado: any, pendiente = false) {
  actionStateMock.mockReturnValue([estado, vi.fn(), pendiente]);
}

describe("FormularioPassword", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    conEstado({ estado: "inicial" });
  });

  afterEach(() => vi.restoreAllMocks());

  /* ---------------- Cabecera y estado ---------------- */

  it("muestra el nombre y username · estado traducido", () => {
    render(<FormularioPassword cuenta={cuenta()} />);
    expect(screen.getByText("Comandancia")).toBeTruthy();
    expect(screen.getByText(/comandancia · activa/)).toBeTruthy();
  });

  it("etiqueta CONFIRMED como 'activa'", () => {
    render(<FormularioPassword cuenta={cuenta({ estado: "CONFIRMED" })} />);
    expect(screen.getByText(/activa/)).toBeTruthy();
  });

  it("etiqueta FORCE_CHANGE_PASSWORD", () => {
    render(<FormularioPassword cuenta={cuenta({ estado: "FORCE_CHANGE_PASSWORD" })} />);
    expect(screen.getByText(/contraseña temporal pendiente/)).toBeTruthy();
  });

  it("etiqueta DESCONOCIDO", () => {
    render(<FormularioPassword cuenta={cuenta({ estado: "DESCONOCIDO" })} />);
    expect(screen.getByText(/estado no disponible/)).toBeTruthy();
  });

  it("para otros estados aplica lower + replace", () => {
    render(<FormularioPassword cuenta={cuenta({ estado: "RESET_REQUIRED" })} />);
    expect(screen.getByText(/reset required/)).toBeTruthy();
  });

  it("si falta nombre, usa username como título", () => {
    render(<FormularioPassword cuenta={cuenta({ nombre: null })} />);
    expect(screen.getByRole("heading")).toHaveTextContent("comandancia");
  });

  /* ---------------- Abrir / cerrar ---------------- */

  it("arranca cerrado con el botón 'Cambiar contraseña…'", () => {
    render(<FormularioPassword cuenta={cuenta()} />);
    expect(screen.getByRole("button", { name: /Cambiar contraseña/ })).toBeTruthy();
    expect(screen.queryByLabelText(/Nueva contraseña/)).toBeNull();
  });

  it("abre el formulario al pulsar el botón", () => {
    render(<FormularioPassword cuenta={cuenta()} />);
    fireEvent.click(screen.getByRole("button", { name: /Cambiar contraseña/ }));
    expect(screen.getByLabelText(/Nueva contraseña/)).toBeTruthy();
    expect(screen.getByLabelText(/Confirmar contraseña/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Guardar contraseña/ })).toBeTruthy();
  });

  it("cancelar cierra el formulario", () => {
    render(<FormularioPassword cuenta={cuenta()} />);
    fireEvent.click(screen.getByRole("button", { name: /Cambiar contraseña/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByLabelText(/Nueva contraseña/)).toBeNull();
  });

  /* ---------------- Hidden inputs ---------------- */

  it("incluye hidden con username y grupo", () => {
    const { container } = render(<FormularioPassword cuenta={cuenta()} />);
    fireEvent.click(screen.getByRole("button", { name: /Cambiar contraseña/ }));
    const usernameHidden = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="username"]',
    );
    const grupoHidden = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="grupo"]',
    );
    expect(usernameHidden?.value).toBe("comandancia");
    expect(grupoHidden?.value).toBe("Comandancia");
  });

  /* ---------------- Pendiente ---------------- */

  it("con pendiente deshabilita inputs y botones", () => {
    conEstado({ estado: "inicial" }, true);
    render(<FormularioPassword cuenta={cuenta()} />);
    fireEvent.click(screen.getByRole("button", { name: /Cambiar contraseña/ }));

    expect((screen.getByLabelText(/Nueva contraseña/) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/Confirmar contraseña/) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /Guardando/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveProperty("disabled", true);
  });

  /* ---------------- Error ---------------- */

  it("muestra el mensaje de error con role=alert", () => {
    conEstado({ estado: "error", mensaje: "Las contraseñas no coinciden.", campo: "confirmacion-comandancia" });
    render(<FormularioPassword cuenta={cuenta()} />);
    fireEvent.click(screen.getByRole("button", { name: /Cambiar contraseña/ }));
    expect(screen.getByRole("alert").textContent).toContain("Las contraseñas no coinciden.");
  });

  it("marca data-invalido en 'nueva' cuando el error lo apunta", () => {
    conEstado({
      estado: "error",
      mensaje: "x",
      campo: "nueva-comandancia",
    });
    const { container } = render(<FormularioPassword cuenta={cuenta()} />);
    fireEvent.click(screen.getByRole("button", { name: /Cambiar contraseña/ }));
    const invalido = container.querySelector('[data-invalido="true"]');
    expect(invalido).toBeTruthy();
  });

  it("marca data-invalido en 'confirmacion' cuando el error lo apunta", () => {
    conEstado({
      estado: "error",
      mensaje: "x",
      campo: "confirmacion-comandancia",
    });
    const { container } = render(<FormularioPassword cuenta={cuenta()} />);
    fireEvent.click(screen.getByRole("button", { name: /Cambiar contraseña/ }));
    const invalido = container.querySelector('[data-invalido="true"]');
    expect(invalido).toBeTruthy();
  });

  it("error de OTRA cuenta no marca este campo", () => {
    conEstado({
      estado: "error",
      mensaje: "x",
      campo: "nueva-otra-cuenta",
    });
    const { container } = render(<FormularioPassword cuenta={cuenta()} />);
    fireEvent.click(screen.getByRole("button", { name: /Cambiar contraseña/ }));
    const invalidos = container.querySelectorAll('[data-invalido="true"]');
    expect(invalidos).toHaveLength(0);
  });

  /* ---------------- OK: cierra el formulario ---------------- */

  it("al pasar a ok cierra el formulario y muestra el mensaje de éxito", () => {
    const { rerender } = render(<FormularioPassword cuenta={cuenta()} />);
    fireEvent.click(screen.getByRole("button", { name: /Cambiar contraseña/ }));
    expect(screen.getByLabelText(/Nueva contraseña/)).toBeTruthy();

    conEstado({ estado: "ok", mensaje: "Contraseña actualizada." });
    rerender(<FormularioPassword cuenta={cuenta()} />);

    expect(screen.queryByLabelText(/Nueva contraseña/)).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Contraseña actualizada.");
    expect(screen.getByRole("button", { name: /Cambiar contraseña/ })).toBeTruthy();
  });

  it("al volver a pulsar 'Cambiar contraseña' el estado ok ya no se muestra", () => {
    const { rerender } = render(<FormularioPassword cuenta={cuenta()} />);
    fireEvent.click(screen.getByRole("button", { name: /Cambiar contraseña/ }));
    conEstado({ estado: "ok", mensaje: "Hecho." });
    rerender(<FormularioPassword cuenta={cuenta()} />);
    expect(screen.getByRole("status")).toBeTruthy();

    // Reabrir
    fireEvent.click(screen.getByRole("button", { name: /Cambiar contraseña/ }));
    // El estado sigue "ok" pero el formulario está abierto → no se muestra el mensaje ok
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("en estado inicial no muestra role=status ni role=alert", () => {
    render(<FormularioPassword cuenta={cuenta()} />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});