// src/__test__/TablaDocumentos.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("../app/panel/bandeja-documental/Etiquetas", () => ({
  EtiquetaEstado: ({ estado }: any) => <span data-testid="etiqueta-estado">{estado}</span>,
  EtiquetaPrioridad: ({ prioridad }: any) => (
    <span data-testid="etiqueta-prioridad">{prioridad}</span>
  ),
}));

import { TablaDocumentos } from "../app/panel/bandeja-documental/documentos/TablaDocumentos";
import type { Documento } from "../lib/tipos-documento";

/* ---------------- Fixtures ---------------- */

const doc = (extra: Partial<Documento> = {}): Documento =>
  ({
    id: "001-2026",
    tipo: "Oficio",
    numero: "Oficio N° 001-2026",
    asunto: "Solicitud de materiales",
    origen: "Comandancia",
    destino: "Administración",
    seccion: "administracion",
    via: "Digital",
    folios: 2,
    fechaIngreso: "01/01/2026",
    plazo: "20/01/2026",
    estado: "Pendiente",
    prioridad: "Alta",
    prioridadManual: false,
    trazabilidad: [],
    ...extra,
  }) as Documento;

const HOY = "10/01/2026";

const docs: Documento[] = [
  doc({ id: "1", numero: "Oficio N° 001-2026", estado: "Pendiente", plazo: "20/01/2026" }),
  doc({
    id: "2",
    numero: "Memo N° 002-2026",
    tipo: "Memorando",
    asunto: "Cambio de guardia",
    origen: "Instrucción",
    destino: "Maquinas",
    estado: "Atendido",
    plazo: "05/01/2026",
  }),
  doc({
    id: "3",
    numero: "Acta N° 003-2026",
    tipo: "Acta",
    asunto: "Reunión de oficiales",
    origen: "Secretaría",
    destino: "Comandancia",
    estado: "Archivado",
    plazo: "15/01/2026",
  }),
];

describe("TablaDocumentos", () => {
  /* ---------------- Render básico ---------------- */

  it("renderiza los chips de estado, sin barra de búsqueda propia", () => {
    render(<TablaDocumentos documentos={docs} hoy={HOY} />);
    expect(screen.queryByRole("searchbox")).toBeNull();
    for (const e of ["Todos", "Pendiente", "En proceso", "Atendido", "Archivado"]) {
      expect(screen.getByRole("button", { name: e })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Vencen pronto" })).toBeTruthy();
  });

  it("renderiza todas las filas cuando no hay filtros", () => {
    render(<TablaDocumentos documentos={docs} hoy={HOY} />);
    expect(screen.getByText("Oficio N° 001-2026")).toBeTruthy();
    expect(screen.getByText("Memo N° 002-2026")).toBeTruthy();
    expect(screen.getByText("Acta N° 003-2026")).toBeTruthy();
  });

  it("cada fila tiene link al detalle", () => {
    render(<TablaDocumentos documentos={docs} hoy={HOY} />);
    const link = screen.getByText("Oficio N° 001-2026").closest("a");
    expect(link?.getAttribute("href")).toBe(
      "/panel/bandeja-documental/documentos/1",
    );
  });

  /* ---------------- Filtro por texto (viene del buscador global) ---------------- */

  it.each([
    ["002", "Memo N° 002-2026"],
    ["cambio", "Memo N° 002-2026"],
    ["secretaría", "Acta N° 003-2026"],
  ])("filtra por texto: %s", (query, resultadoEsperado) => {
    render(<TablaDocumentos documentos={docs} hoy={HOY} busqueda={query} />);
    expect(screen.getByText(resultadoEsperado)).toBeTruthy();
    expect(screen.queryByText("Oficio N° 001-2026")).toBeNull();
  });

  it("filtra por destino", () => {
    render(<TablaDocumentos documentos={docs} hoy={HOY} busqueda="comandancia" />);
    expect(screen.getByText("Acta N° 003-2026")).toBeTruthy();
  });

  it("el filtro de texto es case-insensitive", () => {
    render(<TablaDocumentos documentos={docs} hoy={HOY} busqueda="OFICIO" />);
    expect(screen.getByText("Oficio N° 001-2026")).toBeTruthy();
  });

  it.each([
    ["sin tilde", "secretaria", "Acta N° 003-2026"],
    ["palabras en otro orden", "guardia memo", "Memo N° 002-2026"],
    ["por tipo", "memorando", "Memo N° 002-2026"],
    ["por estado", "archivado", "Acta N° 003-2026"],
  ])("encuentra lo mismo que el buscador global: %s", (_, query, esperado) => {
    render(<TablaDocumentos documentos={docs} hoy={HOY} busqueda={query} />);
    expect(screen.getByText(esperado)).toBeTruthy();
    expect(screen.queryByText("Oficio N° 001-2026")).toBeNull();
  });

  it("sin búsqueda no muestra la etiqueta", () => {
    render(<TablaDocumentos documentos={docs} hoy={HOY} busqueda="   " />);
    expect(screen.queryByRole("link", { name: /Quitar la búsqueda/ })).toBeNull();
    expect(screen.getByText("Oficio N° 001-2026")).toBeTruthy();
  });

  it("con búsqueda muestra qué se filtró y permite quitarlo", () => {
    render(
      <TablaDocumentos
        documentos={docs}
        hoy={HOY}
        busqueda=" memo "
        hrefSinBusqueda="/panel/bandeja-documental/documentos?seccion=sanidad"
      />,
    );
    expect(screen.getByText("Búsqueda: “memo”")).toBeTruthy();
    const quitar = screen.getByRole("link", { name: "Quitar la búsqueda: memo" });
    expect(quitar.getAttribute("href")).toBe("/panel/bandeja-documental/documentos?seccion=sanidad");
  });

  it("sigue a la URL: una búsqueda nueva reemplaza a la anterior", () => {
    const { rerender } = render(<TablaDocumentos documentos={docs} hoy={HOY} busqueda="memo" />);
    expect(screen.queryByText("Acta N° 003-2026")).toBeNull();

    rerender(<TablaDocumentos documentos={docs} hoy={HOY} busqueda="acta" />);
    expect(screen.getByText("Acta N° 003-2026")).toBeTruthy();
    expect(screen.queryByText("Memo N° 002-2026")).toBeNull();

    rerender(<TablaDocumentos documentos={docs} hoy={HOY} />);
    expect(screen.getByText("Oficio N° 001-2026")).toBeTruthy();
    expect(screen.getByText("Memo N° 002-2026")).toBeTruthy();
  });

  /* ---------------- Filtro por estado ---------------- */

  it("filtra por estado Pendiente", () => {
    render(<TablaDocumentos documentos={docs} hoy={HOY} />);
    fireEvent.click(screen.getByRole("button", { name: "Pendiente" }));
    expect(screen.getByText("Oficio N° 001-2026")).toBeTruthy();
    expect(screen.queryByText("Memo N° 002-2026")).toBeNull();
  });

  it("filtra por estado Atendido", () => {
    render(<TablaDocumentos documentos={docs} hoy={HOY} />);
    fireEvent.click(screen.getByRole("button", { name: "Atendido" }));
    expect(screen.getByText("Memo N° 002-2026")).toBeTruthy();
    expect(screen.queryByText("Oficio N° 001-2026")).toBeNull();
  });

  it("vuelve a Todos", () => {
    render(<TablaDocumentos documentos={docs} hoy={HOY} />);
    fireEvent.click(screen.getByRole("button", { name: "Pendiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Todos" }));
    expect(screen.getByText("Oficio N° 001-2026")).toBeTruthy();
    expect(screen.getByText("Memo N° 002-2026")).toBeTruthy();
  });

  /* ---------------- Filtro "Vencen pronto" ---------------- */

  it("'Vencen pronto' filtra por plazo cuando se activa", () => {
    // hoy = 10/01/2026.
    // doc1: vence 20/01/2026 → no
    // doc2: vence 05/01/2026 → vencido, pero Atendido (no abierto) → no
    // doc3: vence 15/01/2026 → por vencer, pero Archivado → no
    render(<TablaDocumentos documentos={docs} hoy={HOY} />);
    fireEvent.click(screen.getByRole("button", { name: "Vencen pronto" }));
    // Ninguno de los tres cumple: los dos cerrados no cuentan y el abierto
    // vence en 10 días (fuera de la ventana de 7).
    expect(screen.getByText(/No se encontraron documentos/)).toBeTruthy();
  });

  it("'Vencen pronto' incluye abiertos por vencer", () => {
    const pronto = doc({ id: "p", numero: "PRONTO-1", plazo: "13/01/2026", estado: "Pendiente" });
    render(<TablaDocumentos documentos={[pronto]} hoy={HOY} />);
    fireEvent.click(screen.getByRole("button", { name: "Vencen pronto" }));
    expect(screen.getByText("PRONTO-1")).toBeTruthy();
  });

  it("'Vencen pronto' arranca activo con soloPlazoInicial", () => {
    render(<TablaDocumentos documentos={docs} hoy={HOY} soloPlazoInicial />);
    const chip = screen.getByRole("button", { name: "Vencen pronto" });
    expect(chip.getAttribute("aria-pressed")).toBe("true");
  });

  it("'Vencen pronto' es toggle", () => {
    render(<TablaDocumentos documentos={docs} hoy={HOY} />);
    const chip = screen.getByRole("button", { name: "Vencen pronto" });
    expect(chip.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(chip);
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(chip);
    expect(chip.getAttribute("aria-pressed")).toBe("false");
  });

  /* ---------------- Combinaciones ---------------- */

  it("combina texto + estado", () => {
    render(<TablaDocumentos documentos={docs} hoy={HOY} busqueda="2026" />);
    fireEvent.click(screen.getByRole("button", { name: "Atendido" }));
    expect(screen.getByText("Memo N° 002-2026")).toBeTruthy();
    expect(screen.queryByText("Oficio N° 001-2026")).toBeNull();
  });

  /* ---------------- Estado vacío ---------------- */

  it("muestra el mensaje de vacío si no hay coincidencias", () => {
    render(<TablaDocumentos documentos={docs} hoy={HOY} busqueda="zzz-no-existe" />);
    expect(screen.getByText(/No se encontraron documentos/)).toBeTruthy();
  });

  it("maneja lista de documentos vacía", () => {
    render(<TablaDocumentos documentos={[]} hoy={HOY} />);
    expect(screen.getByText(/No se encontraron documentos/)).toBeTruthy();
  });

  /* ---------------- Plazo inválido en `hoy` ---------------- */

  it("tolera hoy con formato inválido", () => {
    render(<TablaDocumentos documentos={docs} hoy="no-es-fecha" soloPlazoInicial />);
    // No debe lanzar; el filtro de plazo usa new Date() como fallback
    expect(screen.getByRole("button", { name: "Vencen pronto" })).toBeTruthy();
  });
});