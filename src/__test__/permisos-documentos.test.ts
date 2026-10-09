// src/__test__/permisos-documentos.test.ts
import { describe, expect, it } from "vitest";
import {
  puedeEliminar,
  puedeGestionarDocumento,
  puedeRegistrar,
  seccionesParaRegistrar,
} from "../lib/permisos-documentos";

const bombero = (extra: Record<string, unknown> = {}) =>
  ({
    sub: "u1",
    nombre: "Ana",
    grado: "Teniente CBP",
    seccion: "administracion",
    grupos: ["Jefe_Administracion"],
    ...extra,
  }) as any;

const documento = (extra: Record<string, unknown> = {}) =>
  ({
    id: "doc-1",
    seccion: "administracion",
    estado: "Pendiente",
    ...extra,
  }) as any;

describe("permisos-documentos", () => {
  describe("puedeRegistrar", () => {
    it("true si su grupo es de una sección", () => {
      expect(puedeRegistrar(bombero())).toBe(true);
    });

    it("false si no tiene grupo, aunque el atributo diga una sección", () => {
      expect(puedeRegistrar(bombero({ grupos: [] }))).toBe(false);
    });
  });

  describe("seccionesParaRegistrar", () => {
    it("devuelve al menos la sección propia", () => {
      expect(seccionesParaRegistrar(bombero())).toContain("administracion");
    });

    it("Jefatura no registra: el backend lo rechaza", () => {
      const jefatura = bombero({ grupos: ["Jefatura"] });
      expect(seccionesParaRegistrar(jefatura)).toEqual([]);
      expect(puedeRegistrar(jefatura)).toBe(false);
    });

    it("vacío si no tiene grupo de sección", () => {
      expect(seccionesParaRegistrar(bombero({ grupos: [] }))).toEqual([]);
    });
  });

  describe("puedeGestionarDocumento", () => {
    it("true si el documento es de su sección", () => {
      expect(puedeGestionarDocumento(bombero(), documento())).toBe(true);
    });

    it("false si es de otra sección y no es jefe", () => {
      expect(
        puedeGestionarDocumento(
          bombero(),
          documento({ seccion: "maquinas" }),
        ),
      ).toBe(false);
    });

    it("false si no tiene grupo aunque el atributo coincida con el documento", () => {
      expect(
        puedeGestionarDocumento(
          bombero({ seccion: "maquinas", grupos: [] }),
          documento({ seccion: "maquinas" }),
        ),
      ).toBe(false);
    });

    it("true si es jefe (grupo Jefatura) aunque sea de otra sección", () => {
      expect(
        puedeGestionarDocumento(
          bombero({ seccion: "instruccion", grupos: ["Jefatura"] }),
          documento({ seccion: "maquinas" }),
        ),
      ).toBe(true);
    });
  });

  describe("puedeEliminar (RN-0028)", () => {
    it("true si es Jefe_Administracion y está Archivado", () => {
      expect(
        puedeEliminar(bombero(), documento({ estado: "Archivado" })),
      ).toBe(true);
    });

    it("true si es Jefe_Administracion por grupo y está Archivado", () => {
      expect(
        puedeEliminar(
          bombero({ seccion: "maquinas", grupos: ["Jefe_Administracion"] }),
          documento({ estado: "Archivado" }),
        ),
      ).toBe(true);
    });

    it("false sin el grupo aunque el atributo diga Administración", () => {
      expect(
        puedeEliminar(
          bombero({ seccion: "administracion", grupos: [] }),
          documento({ estado: "Archivado" }),
        ),
      ).toBe(false);
    });

    it("false si no es de Administración ni tiene el grupo", () => {
      expect(
        puedeEliminar(
          bombero({ seccion: "maquinas", grupos: [] }),
          documento({ estado: "Archivado" }),
        ),
      ).toBe(false);
    });

    it("false aunque sea admin si no está Archivado", () => {
      expect(
        puedeEliminar(bombero(), documento({ estado: "Pendiente" })),
      ).toBe(false);
    });
  });
});