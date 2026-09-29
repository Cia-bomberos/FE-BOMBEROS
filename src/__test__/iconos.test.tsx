// src/__test__/iconos.test.tsx
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import * as Iconos from "../app/panel/iconos";

/* Lista explícita: si falta uno, es porque lo hemos olvidado exponer */
const NOMBRES = [
  "IconTablero",
  "IconBandeja",
  "IconGrafico",
  "IconEngranaje",
  "IconBuscar",
  "IconSalir",
  "IconFlecha",
  "IconDescarga",
  "IconUnidad",
  "IconPersonal",
  "IconCarpeta",
  "IconEdificio",
  "IconCruz",
  "IconLuna",
  "IconSol",
  "IconProteccion",
  "IconMaletin",
  "IconMegafono",
  "IconAlerta",
  "IconCheck",
  "IconCaja",
  "IconMas",
] as const;

describe("iconos", () => {
  it("todos los iconos están exportados", () => {
    for (const nombre of NOMBRES) {
      expect((Iconos as any)[nombre]).toBeTypeOf("function");
    }
  });

  for (const nombre of NOMBRES) {
    describe(nombre, () => {
      it("renderiza un <svg> con aria-hidden", () => {
        const C = (Iconos as any)[nombre];
        const { container } = render(<C />);
        const svg = container.querySelector("svg");
        expect(svg).toBeTruthy();
        expect(svg?.getAttribute("aria-hidden")).toBe("true");
      });

      it("aplica los atributos base (viewBox, fill, stroke)", () => {
        const C = (Iconos as any)[nombre];
        const { container } = render(<C />);
        const svg = container.querySelector("svg")!;
        expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
        expect(svg.getAttribute("fill")).toBe("none");
        expect(svg.getAttribute("stroke")).toBe("currentColor");
        expect(svg.getAttribute("stroke-width")).toBe("1.6");
        expect(svg.getAttribute("stroke-linecap")).toBe("round");
        expect(svg.getAttribute("stroke-linejoin")).toBe("round");
      });

      it("acepta props de tamaño personalizadas", () => {
        const C = (Iconos as any)[nombre];
        const { container } = render(<C width={32} height={32} />);
        const svg = container.querySelector("svg")!;
        expect(svg.getAttribute("width")).toBe("32");
        expect(svg.getAttribute("height")).toBe("32");
      });

      it("el className externo se propaga", () => {
        const C = (Iconos as any)[nombre];
        const { container } = render(<C className="mi-clase" />);
        const svg = container.querySelector("svg")!;
        expect(svg.classList.contains("mi-clase")).toBe(true);
      });
    });
  }
});