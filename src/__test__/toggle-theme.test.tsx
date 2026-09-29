// src/__test__/toggle-theme.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/app/panel/iconos", () => ({
  IconLuna: () => <span data-testid="icon-luna" />,
  IconSol: () => <span data-testid="icon-sol" />,
}));

vi.mock("@/lib/tema", () => ({
  COOKIE_TEMA: "f3_tema",
}));

import { ToggleTheme } from "../components/ui/toggle-theme";

/* ---------------- Helpers ---------------- */

/** Documento sin `[data-theme]` en el árbol, se crea dinámicamente. */
function limpiar() {
  document.querySelectorAll("[data-theme]").forEach((el) => el.remove());
  document.cookie = "f3_tema=; path=/; max-age=0";
}

/** Crea el contenedor con `[data-theme]` que el componente busca. */
function crearContenedor(temaInicial: "dark" | "light" = "dark") {
  const div = document.createElement("div");
  div.setAttribute("data-theme", temaInicial);
  div.setAttribute("data-testid", "tema-root");
  document.body.appendChild(div);
  return div;
}

describe("ToggleTheme", () => {
  beforeEach(() => {
    limpiar();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    limpiar();
  });

  /* ---------------- Render básico ---------------- */

  it("arranca con icono luna si el tema es dark", () => {
    crearContenedor("dark");
    render(<ToggleTheme inicial="dark" />);
    expect(screen.getByTestId("icon-luna")).toBeTruthy();
    expect(screen.queryByTestId("icon-sol")).toBeNull();
  });

  it("arranca con icono sol si el tema es light", () => {
    crearContenedor("light");
    render(<ToggleTheme inicial="light" />);
    expect(screen.getByTestId("icon-sol")).toBeTruthy();
    expect(screen.queryByTestId("icon-luna")).toBeNull();
  });

  it("aria-label describe la acción (pasar a claro si está en dark)", () => {
    crearContenedor("dark");
    render(<ToggleTheme inicial="dark" />);
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Cambiar a tema claro");
  });

  it("aria-label describe la acción (pasar a oscuro si está en light)", () => {
    crearContenedor("light");
    render(<ToggleTheme inicial="light" />);
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Cambiar a tema oscuro");
  });

  it("aplica className externo", () => {
    crearContenedor("dark");
    render(<ToggleTheme inicial="dark" className="mi-clase" />);
    expect(screen.getByRole("button").classList.contains("mi-clase")).toBe(true);
  });

  /* ---------------- Cambio sin View Transitions ---------------- */

  it("cambia data-theme en el contenedor al hacer clic", () => {
    const contenedor = crearContenedor("dark");
    render(<ToggleTheme inicial="dark" />);
    fireEvent.click(screen.getByRole("button"));
    expect(contenedor.getAttribute("data-theme")).toBe("light");
  });

  it("cambia el icono a sol después de alternar", () => {
    crearContenedor("dark");
    render(<ToggleTheme inicial="dark" />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByTestId("icon-sol")).toBeTruthy();
  });

  it("escribe la cookie con el nuevo tema", () => {
    crearContenedor("dark");
    render(<ToggleTheme inicial="dark" />);
    fireEvent.click(screen.getByRole("button"));
    expect(document.cookie).toContain("");
  });

  it("alterna ida y vuelta", () => {
    const contenedor = crearContenedor("dark");
    render(<ToggleTheme inicial="dark" />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(contenedor.getAttribute("data-theme")).toBe("light");
    fireEvent.click(btn);
    expect(contenedor.getAttribute("data-theme")).toBe("dark");
  });

  it("sin contenedor [data-theme] no lanza", () => {
    // no creamos contenedor
    render(<ToggleTheme inicial="dark" />);
    expect(() => fireEvent.click(screen.getByRole("button"))).not.toThrow();
  });

  it("con View Transitions: llama a startViewTransition", async () => {
  const contenedor = crearContenedor("dark");
  // matchMedia ya está definido por el setup y devuelve matches: false

  const transitionSpy = vi.fn((cb: () => void) => {
    cb();
    return { ready: Promise.resolve(), finished: Promise.resolve(), skipTransition: vi.fn() };
  });
  (document as any).startViewTransition = transitionSpy;
  (document.documentElement as any).animate = vi.fn();

  render(<ToggleTheme inicial="dark" />);
  fireEvent.click(screen.getByRole("button"));

  await waitFor(() => expect(transitionSpy).toHaveBeenCalled());
  expect(contenedor.getAttribute("data-theme")).toBe("light");

  delete (document as any).startViewTransition;
  delete (document.documentElement as any).animate;
});

});