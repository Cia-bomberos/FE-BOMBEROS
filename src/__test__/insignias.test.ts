// src/__test__/insignias.test.ts
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROLES_ADMINISTRABLES, type ClaveRol } from "../lib/roles";
import { insigniaDe } from "../lib/secciones";
import type { Bombero } from "../lib/tipos";

const conRol = (rol: ClaveRol | null) => ({ rol, grupos: rol ? [rol] : [] }) as Bombero;

describe("insigniaDe", () => {
  it.each([
    ["Jefe_Administracion", "/insignias/administracion.png", "Administración"],
    ["Jefe_ServicioGeneral", "/insignias/servicio-general.png", "Servicio General"],
    ["Jefe_Sanidad", "/insignias/sanidad.png", "Sanidad"],
    ["Jefe_Maquinas", "/insignias/maquinas.png", "Máquinas"],
  ] as const)("%s ve la insignia de su sección", (rol, src, nombre) => {
    expect(insigniaDe(conRol(rol))).toEqual({
      src,
      alt: `Insignia de la sección ${nombre}`,
    });
  });

  it("Jefatura no tiene insignia: el panel muestra el escudo", () => {
    expect(insigniaDe(conRol("Jefatura"))).toBeNull();
  });

  it("sin rol reconocido no hay insignia", () => {
    expect(insigniaDe(conRol(null))).toBeNull();
  });

  it("cada cuenta de sección tiene su archivo en public/", () => {
    for (const rol of ROLES_ADMINISTRABLES) {
      const insignia = insigniaDe(conRol(rol));
      expect(insignia).not.toBeNull();
      expect(existsSync(join(process.cwd(), "public", insignia!.src))).toBe(true);
    }
  });
});
