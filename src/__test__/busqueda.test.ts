import { describe, expect, it } from "vitest";
import { coincideBusqueda, normalizar, tokensDe } from "../lib/busqueda";

describe("busqueda", () => {
  it("normalizar quita tildes y mayúsculas", () => {
    expect(normalizar("SECRETARÍA Máquinas")).toBe("secretaria maquinas");
  });

  it("tokensDe separa palabras e ignora espacios de más", () => {
    expect(tokensDe("  Oficio   Nº 12 ")).toEqual(["oficio", "nº", "12"]);
    expect(tokensDe("   ")).toEqual([]);
  });

  it.each([
    ["secretaria", true],
    ["reunión acta", true],
    ["acta zzz", false],
    ["", true],
  ])("coincideBusqueda con %s → %s", (consulta, esperado) => {
    const campos = ["Acta N° 003", "Reunión de oficiales", "Secretaría"];
    expect(coincideBusqueda(tokensDe(consulta), campos)).toBe(esperado);
  });
});
