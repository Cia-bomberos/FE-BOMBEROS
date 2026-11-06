// src/__test__/visor-documento.test.tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { VisorDocumento } from "../app/panel/bandeja-documental/documentos/[id]/VisorDocumento";

const URL_VISOR = "/panel/bandeja-documental/documentos/abc/ver";

const montar = () => render(<VisorDocumento id="abc" numero="OF-001-2026" />);
const abrir = () => fireEvent.click(screen.getByRole("button", { name: "Ver documento" }));

describe("VisorDocumento", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("no pide el PDF hasta que se abre", () => {
    montar();
    expect(screen.queryByTitle("Documento OF-001-2026")).toBeNull();
    expect(screen.getByRole("button", { name: "Ver documento" }).getAttribute("aria-expanded")).toBe(
      "false",
    );
  });

  it("al abrir muestra el PDF desde la ruta del visor", () => {
    montar();
    abrir();
    expect(screen.getByTitle("Documento OF-001-2026").getAttribute("src")).toBe(URL_VISOR);
    expect(
      screen.getByRole("button", { name: "Ocultar documento" }).getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("ofrece abrirlo en otra pestaña", () => {
    montar();
    abrir();
    const enlace = screen.getByRole("link", { name: "Abrir en otra pestaña" });
    expect(enlace.getAttribute("href")).toBe(URL_VISOR);
    expect(enlace.getAttribute("target")).toBe("_blank");
  });

  it("avisa mientras carga y deja de hacerlo al terminar", () => {
    montar();
    abrir();
    expect(screen.getByText("Cargando documento…")).toBeTruthy();
    fireEvent.load(screen.getByTitle("Documento OF-001-2026"));
    expect(screen.queryByText("Cargando documento…")).toBeNull();
  });

  it("ocultar quita el visor y al reabrir vuelve a avisar de la carga", () => {
    montar();
    abrir();
    fireEvent.load(screen.getByTitle("Documento OF-001-2026"));
    fireEvent.click(screen.getByRole("button", { name: "Ocultar documento" }));
    expect(screen.queryByTitle("Documento OF-001-2026")).toBeNull();

    abrir();
    expect(screen.getByText("Cargando documento…")).toBeTruthy();
  });

  it("sin visor de PDF en el navegador ofrece solo abrirlo aparte", () => {
    vi.stubGlobal("navigator", { ...navigator, pdfViewerEnabled: false });
    montar();
    abrir();
    expect(screen.queryByTitle("Documento OF-001-2026")).toBeNull();
    expect(screen.getByText(/no muestra PDF dentro de la página/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Abrir en otra pestaña" })).toBeTruthy();
  });
});
