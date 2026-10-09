// src/__test__/cuentas-api.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("../lib/roles", async () => {
  const real = await vi.importActual<any>("../lib/roles");
  return real;
});

import {
  cambiarPasswordCuenta,
  cuentasDelCatalogo,
  listarCuentas,
  validarPolitica,
} from "../lib/cuentas-api";
import { apiFetch } from "../lib/api";
import { ROLES_ADMINISTRABLES, ROLES } from "../lib/roles";

describe("cuentas-api", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("listarCuentas", () => {
    it("devuelve el error tal cual si apiFetch falla", async () => {
      (apiFetch as any).mockResolvedValue({
        ok: false,
        estado: 500,
        motivo: "boom",
      });
      const r = await listarCuentas();
      expect(r).toEqual({ ok: false, estado: 500, motivo: "boom" });
    });

    it("ordena según ROLES_ADMINISTRABLES", async () => {
      const cuentas = [...ROLES_ADMINISTRABLES]
        .reverse()
        .map((grupo) => ({
          username: `u-${grupo}`,
          nombre: `n-${grupo}`,
          grupo,
          estado: "CONFIRMED",
        }));
      (apiFetch as any).mockResolvedValue({
        ok: true,
        datos: { cuentas },
      });
      const r = await listarCuentas();
      expect(r.ok).toBe(true);
      if (r.ok) {
        const orden = r.datos.map((c) => c.grupo);
        const esperado = [...orden].sort(
          (a, b) => ROLES_ADMINISTRABLES.indexOf(a) - ROLES_ADMINISTRABLES.indexOf(b),
        );
        expect(orden).toEqual(esperado);
      }
    });
  });

  describe("cambiarPasswordCuenta", () => {
    it("llama al endpoint correcto con PATCH", async () => {
      (apiFetch as any).mockResolvedValue({ ok: true, datos: { mensaje: "ok" } });
      await cambiarPasswordCuenta("usuario/admin", "NuevaClave1");
      expect(apiFetch).toHaveBeenCalledWith(
        "/admin/cuentas/usuario%2Fadmin/password",
        { metodo: "PATCH", cuerpo: { nueva_password: "NuevaClave1" } },
      );
    });
  });

  describe("cuentasDelCatalogo", () => {
    it("solo devuelve las cuentas administrables", () => {
      const lista = cuentasDelCatalogo();
      expect(lista.every((c) => ROLES_ADMINISTRABLES.includes(c.grupo))).toBe(true);
      expect(lista).toHaveLength(ROLES_ADMINISTRABLES.length);
    });

    it("marca el estado como DESCONOCIDO", () => {
      expect(cuentasDelCatalogo().every((c) => c.estado === "DESCONOCIDO")).toBe(true);
    });

    it("toma el usuario y cargo del rol", () => {
      const lista = cuentasDelCatalogo();
      for (const cuenta of lista) {
        const rol = ROLES.find((r) => r.clave === cuenta.grupo)!;
        expect(cuenta.username).toBe(rol.usuario);
        expect(cuenta.nombre).toBe(rol.cargo);
      }
    });
  });

  describe("validarPolitica", () => {
    it("acepta una clave válida", () => {
      expect(validarPolitica("NuevaClave1")).toBeNull();
    });

    it("rechaza por longitud", () => {
      expect(validarPolitica("Aa1")).toMatch(/8 caracteres/);
    });

    it("rechaza sin minúscula", () => {
      expect(validarPolitica("AAAAAAAA1")).toMatch(/minúscula/);
    });

    it("rechaza sin mayúscula", () => {
      expect(validarPolitica("aaaaaaaa1")).toMatch(/mayúscula/);
    });

    it("rechaza sin número", () => {
      expect(validarPolitica("Aaaaaaaaa")).toMatch(/número/);
    });

    it("acepta símbolos opcionales", () => {
      expect(validarPolitica("NuevaClave1!@#")).toBeNull();
    });
  });
});