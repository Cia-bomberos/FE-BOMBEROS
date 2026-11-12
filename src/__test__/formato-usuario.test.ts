import { describe, expect, it } from "vitest";
import { USERNAME_MAX, validarUsername } from "../lib/formato-usuario";

describe("validarUsername", () => {
  it.each(["jefatura", "serviciogeneral", "jefe.administracion", "maq_2", "san-1", "abc"])(
    "acepta %s",
    (u) => expect(validarUsername(u)).toBeNull(),
  );

  it("rechaza menos de 3 caracteres", () => {
    expect(validarUsername("ab")).toMatch(/al menos 3/);
  });

  it("rechaza más del máximo", () => {
    expect(validarUsername("a".repeat(USERNAME_MAX + 1))).toMatch(/más de 30/);
    expect(validarUsername("a".repeat(USERNAME_MAX))).toBeNull();
  });

  it.each(["Jefatura", "con espacio", "ñandú", "a..b", "-abc", "abc_", "a@b", "<script>"])(
    "rechaza %s",
    (u) => expect(validarUsername(u)).toMatch(/minúsculas/),
  );
});
