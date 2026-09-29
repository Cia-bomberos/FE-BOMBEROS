// src/__test__/etiquetas-inventario.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../app/panel/panel.module.css", () => ({
  default: {
    estadoAtendido: "css-estadoAtendido",
    estadoPendiente: "css-estadoPendiente",
    estadoArchivado: "css-estadoArchivado",
    prioridadAlta: "css-prioridadAlta",
    etiqueta: "css-etiqueta",
  },
}));

import { EtiquetaEstadoActivo } from "../app/panel/inventario/Etiquetas";

describe("EtiquetaEstadoActivo", () => {
  it("renderiza el texto del estado", () => {
    render(<EtiquetaEstadoActivo estado="Operativo" />);
    expect(screen.getByText("Operativo")).toBeTruthy();
  });

  const casos: Array<[any, string]> = [
    ["Operativo", "css-estadoAtendido"],
    ["Disponible", "css-estadoAtendido"],
    ["En reparación", "css-estadoPendiente"],
    ["Bajo stock", "css-estadoPendiente"],
    ["De baja", "css-estadoArchivado"],
    ["Vencido", "css-prioridadAlta"],
  ];

  for (const [estado, clase] of casos) {
    it(`aplica ${clase} para "${estado}"`, () => {
      render(<EtiquetaEstadoActivo estado={estado} />);
      expect(screen.getByText(estado).classList.contains(clase)).toBe(true);
    });
  }

  it("siempre incluye la clase base etiqueta", () => {
    render(<EtiquetaEstadoActivo estado="Operativo" />);
    expect(screen.getByText("Operativo").classList.contains("css-etiqueta")).toBe(true);
  });
});