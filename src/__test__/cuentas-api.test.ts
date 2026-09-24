import { describe, expect, it } from "vitest";
import { validarPolitica } from "../lib/cuentas-api";

describe("validarPolitica", () => {
  it("debe rechazar contraseñas de menos de 8 caracteres", () => {
    const resultado = validarPolitica("Ab1!");
    expect(resultado).toBe("Debe tener al menos 8 caracteres.");
  });

  it("debe rechazar contraseñas sin letras minúsculas", () => {
    const resultado = validarPolitica("ABCDEFGH1");
    expect(resultado).toBe("Debe incluir al menos una minúscula.");
  });

  it("debe rechazar contraseñas sin letras mayúsculas", () => {
    const resultado = validarPolitica("abcdefgh1");
    expect(resultado).toBe("Debe incluir al menos una mayúscula.");
  });

  it("debe rechazar contraseñas sin números", () => {
    const resultado = validarPolitica("Abcdefgh");
    expect(resultado).toBe("Debe incluir al menos un número.");
  });

  it("debe aceptar contraseñas válidas que cumplen la política", () => {
    const resultado = validarPolitica("ClaveSegura123");
    expect(resultado).toBeNull();
  });
});