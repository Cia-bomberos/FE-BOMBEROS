// src/__test__/tema.test.ts
import { describe, expect, it } from "vitest";
import {
  COOKIE_TEMA,
  esTema,
  TEMA_POR_DEFECTO,
} from "../lib/tema";

describe("tema", () => {
  it("la cookie tiene el nombre esperado", () => {
    expect(COOKIE_TEMA).toBe("f3_tema");
  });

  it("el tema por defecto es dark", () => {
    expect(TEMA_POR_DEFECTO).toBe("dark");
  });

  describe("esTema", () => {
    it("true para dark y light", () => {
      expect(esTema("dark")).toBe(true);
      expect(esTema("light")).toBe(true);
    });

    it("false para cualquier otro valor", () => {
      expect(esTema("auto")).toBe(false);
      expect(esTema("")).toBe(false);
      expect(esTema(undefined)).toBe(false);
      expect(esTema(null)).toBe(false);
      expect(esTema(0)).toBe(false);
      expect(esTema({})).toBe(false);
    });
  });
});