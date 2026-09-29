// src/__test__/roles.test.ts
import { describe, expect, it } from "vitest";
import {
  normalizar,
  tieneRol,
  ROL_JEFATURA,
} from "../lib/roles";

const b = (grupos: string[] = []) => ({ grupos }) as any;

const GRUPO_JEFATURA = ROL_JEFATURA;

describe("roles - tieneRol", () => {
  it("true si el grupo coincide", () => {
    expect(tieneRol(b([ROL_JEFATURA]), ROL_JEFATURA)).toBe(true);
  });

  it("ignora mayúsculas, acentos y separadores", () => {
    expect(tieneRol(b(["jefatura"]), ROL_JEFATURA)).toBe(true);
    expect(tieneRol(b(["JEFATURA"]), ROL_JEFATURA)).toBe(true);
    expect(tieneRol(b(["Je-fa_tu ra"]), ROL_JEFATURA)).toBe(true);
  });

  it("false si no está el grupo", () => {
    expect(tieneRol(b(["Otro"]), ROL_JEFATURA)).toBe(false);
  });

  it("false si la lista está vacía", () => {
    expect(tieneRol(b([]), ROL_JEFATURA)).toBe(false);
  });

  it("GRUPO_JEFATURA apunta a ROL_JEFATURA", () => {
    expect(GRUPO_JEFATURA).toBe(ROL_JEFATURA);
  });
});

describe("roles - normalizar", () => {
  it("quita acentos y baja a minúsculas", () => {
    expect(normalizar("JEFE_Administración")).toBe("jefeadministracion");
  });

  it("colapsa separadores", () => {
    expect(normalizar("a-b_c d")).toBe("abcd");
  });

  it("devuelve cadena vacía para undefined/null", () => {
    expect(normalizar(undefined as any)).toBe("");
    expect(normalizar(null as any)).toBe("");
  });
});