// src/__test__/tipos.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/roles", () => ({
  rolDe: vi.fn(() => null),
}));

import { bomberoDesdeClaims, inicialesDe } from "../lib/tipos";
import { rolDe } from "../lib/roles";

const claims = (extra: Record<string, unknown> = {}) =>
  ({ sub: "u-1", exp: 0, iss: "", token_use: "id", ...extra }) as any;

describe("tipos - inicialesDe", () => {
  it("toma las dos primeras iniciales", () => {
    expect(inicialesDe("Ana María Torres")).toBe("AM");
  });

  it("una sola palabra → una inicial", () => {
    expect(inicialesDe("Ana")).toBe("A");
  });

  it("tolera espacios sobrantes", () => {
    expect(inicialesDe("  Juan   Pérez  ")).toBe("JP");
  });

  it("devuelve cadena vacía con nombre vacío", () => {
    expect(inicialesDe("")).toBe("");
    expect(inicialesDe("   ")).toBe("");
  });
});

describe("tipos - bomberoDesdeClaims", () => {
  it("usa name como nombre preferido", () => {
    const b = bomberoDesdeClaims(claims({ name: "Ana Torres" }));
    expect(b.nombre).toBe("Ana Torres");
    expect(b.iniciales).toBe("AT");
  });

  it("cae a given_name + family_name", () => {
    const b = bomberoDesdeClaims(
      claims({ given_name: "Ana", family_name: "Torres" }),
    );
    expect(b.nombre).toBe("Ana Torres");
  });

  it("cae a cognito:username como último recurso", () => {
    const b = bomberoDesdeClaims(claims({ "cognito:username": "atorres" }));
    expect(b.nombre).toBe("atorres");
  });

  it("prefiere custom:nombre sobre name", () => {
    const b = bomberoDesdeClaims(
      claims({ name: "Nombre", "custom:nombre": "Nombre Custom" }),
    );
    expect(b.nombre).toBe("Nombre");
  });

  it("codigo prioriza custom:codigo", () => {
    const b = bomberoDesdeClaims(
      claims({ "custom:codigo": "C-1", "cognito:username": "u" }),
    );
    expect(b.codigo).toBe("C-1");
  });

  it("codigo cae a cognito:username", () => {
    const b = bomberoDesdeClaims(claims({ "cognito:username": "u" }));
    expect(b.codigo).toBe("u");
  });

  it("codigo cae a sub", () => {
    const b = bomberoDesdeClaims(claims());
    expect(b.codigo).toBe("u-1");
  });

  it("grupos vacío si no viene cognito:groups", () => {
    const b = bomberoDesdeClaims(claims());
    expect(b.grupos).toEqual([]);
    expect(b.rol).toBeNull();
  });

  it("grupos se copian si vienen como array", () => {
    const b = bomberoDesdeClaims(claims({ "cognito:groups": ["Jefatura"] }));
    expect(b.grupos).toEqual(["Jefatura"]);
  });

  it("sin custom:cargo usa el cargo del rol", () => {
    (rolDe as any).mockReturnValueOnce({
      clave: "Jefatura",
      cargo: "Jefe de Compañía",
      seccion: "administracion",
    });
    const b = bomberoDesdeClaims(claims({ "cognito:groups": ["Jefatura"] }));
    expect(b.cargo).toBe("Jefe de Compañía");
    expect(b.seccion).toBe("administracion");
    expect(b.rol).toBe("Jefatura");
  });

  it("custom:cargo gana sobre el rol", () => {
    (rolDe as any).mockReturnValueOnce({
      clave: "Jefatura",
      cargo: "X",
      seccion: "Y",
    });
    const b = bomberoDesdeClaims(
      claims({ "custom:cargo": "Cargo Custom", "cognito:groups": ["Jefatura"] }),
    );
    expect(b.cargo).toBe("Cargo Custom");
  });

  it("sin rol → cargo y sección por defecto", () => {
    (rolDe as any).mockReturnValueOnce(null);
    const b = bomberoDesdeClaims(claims());
    expect(b.cargo).toBe("Personal de la Compañía");
    expect(b.seccion).toBe("General");
    expect(b.rol).toBeNull();
  });
});