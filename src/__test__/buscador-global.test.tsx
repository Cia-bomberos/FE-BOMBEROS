// buscadorglobal.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BuscadorGlobal } from "../app/panel/BuscadorGlobal";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const docs = [
  { id: "1", numero: "Oficio N° 001-2026", tipo: "Oficio", asunto: "Solicitud de materiales", origen: "Comandancia", seccion: "Administración", estado: "Pendiente" },
  { id: "2", numero: "Memo N° 002-2026", tipo: "Memorando", asunto: "Cambio de guardia", origen: "Instrucción", seccion: "Instrucción", estado: "Atendido" },
];

describe("BuscadorGlobal", () => {
  beforeEach(() => {
    // asegurar el contenedor del portal
    const div = document.createElement("div");
    div.setAttribute("data-panel", "");
    document.body.appendChild(div);
  });

  it("abre la paleta al hacer clic", () => {
    render(<BuscadorGlobal documentos={docs as any} />);
    fireEvent.click(screen.getByRole("button", { name: /buscar/i }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("filtra por asunto sin acentos", () => {
    render(<BuscadorGlobal documentos={docs as any} />);
    fireEvent.click(screen.getByRole("button", { name: /buscar/i }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "instruccion" } });
    expect(screen.getByText(/Cambio de guardia/)).toBeTruthy();
  });

  it("muestra mensaje si no hay coincidencias", () => {
    render(<BuscadorGlobal documentos={docs as any} />);
    fireEvent.click(screen.getByRole("button", { name: /buscar/i }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "zzz" } });
    expect(screen.getByText(/Sin coincidencias/)).toBeTruthy();
  });

  it("⌘K abre y Escape cierra", () => {
    render(<BuscadorGlobal documentos={docs as any} />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});