// src/__test__/no-encontrada.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("../lib/tema-servidor", () => ({ obtenerTema: vi.fn(async () => "light") }));

import NoEncontradaPanel from "../app/panel/not-found";
import NoEncontradaRaiz from "../app/not-found";
import RutaInexistente from "../app/panel/[...resto]/page";

describe("404", () => {
  it("en el panel ofrece volver al resumen y ver documentos", () => {
    render(<NoEncontradaPanel />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Esta página no existe");
    expect(screen.getByRole("link", { name: /Volver al resumen/ }).getAttribute("href")).toBe(
      "/panel/bandeja-documental",
    );
    expect(screen.getByRole("link", { name: "Ver documentos" }).getAttribute("href")).toBe(
      "/panel/bandeja-documental/documentos",
    );
    // El pie lo pone el layout del panel, no el 404.
    expect(screen.queryByRole("contentinfo")).toBeNull();
  });

  it("el código 404 es decorativo", () => {
    render(<NoEncontradaPanel />);
    expect(screen.getByText("404").getAttribute("aria-hidden")).toBe("true");
  });

  it("fuera del panel lleva al inicio y respeta el tema", async () => {
    const { container } = render(await NoEncontradaRaiz());

    expect(screen.getByRole("link", { name: /Ir al inicio/ }).getAttribute("href")).toBe("/panel");
    expect(screen.queryByRole("link", { name: "Ver documentos" })).toBeNull();
    expect(container.querySelector('[data-theme="light"]')).toBeTruthy();
    expect(screen.getByRole("contentinfo").textContent).toContain("France N°3");
  });

  it("las rutas inexistentes del panel lanzan notFound", () => {
    expect(() => RutaInexistente()).toThrow("NEXT_NOT_FOUND");
  });
});
