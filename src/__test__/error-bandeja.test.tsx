// src/__test__/error-bandeja.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../app/panel/iconos", () => ({
  IconAlerta: () => <span data-testid="icon-alerta" />,
}));

import ErrorBandeja from "../app/panel/bandeja-documental/error";

describe("ErrorBandeja", () => {
  it("muestra mensaje y botón", () => {
    const retry = vi.fn();
    render(<ErrorBandeja error={new Error("x")} retry={retry} />);
    
    expect(screen.getByRole("alert").textContent).toContain("No se pudo cargar");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });

  it("llama a retry al hacer click", () => {
    const retry = vi.fn();
    render(<ErrorBandeja error={new Error("x")} retry={retry} />);
    
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});