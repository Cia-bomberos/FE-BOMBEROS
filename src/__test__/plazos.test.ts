// src/__test__/plazos.test.ts
import { describe, expect, it } from "vitest";
import {
  DIAS_AVISO,
  diasRestantes,
  parsearFecha,
  requiereAtencion,
  resumenPlazos,
} from "../lib/plazos";
import type { Documento } from "../lib/datos-demo";

const doc = (extra: Partial<Documento> = {}): Documento =>
  ({
    id: "doc-1",
    estado: "Pendiente",
    plazo: "01/01/2026",
    ...extra,
  }) as Documento;

describe("plazos", () => {
  describe("parsearFecha", () => {
    it("devuelve Date local a medianoche", () => {
      const f = parsearFecha("15/03/2026")!;
      expect(f.getFullYear()).toBe(2026);
      expect(f.getMonth()).toBe(2); // marzo = 2
      expect(f.getDate()).toBe(15);
      expect(f.getHours()).toBe(0);
      expect(f.getMinutes()).toBe(0);
    });

    it("devuelve null si faltan partes", () => {
      expect(parsearFecha("")).toBeNull();
      expect(parsearFecha("01/02")).toBeNull();
      expect(parsearFecha("abc")).toBeNull();
    });

    it("devuelve null si alguna parte es 0 o NaN", () => {
      expect(parsearFecha("00/01/2026")).toBeNull();
      expect(parsearFecha("01/00/2026")).toBeNull();
      expect(parsearFecha("01/01/0000")).toBeNull();
    });
  });

  describe("diasRestantes", () => {
    const hoy = new Date(2026, 0, 10); // 10/01/2026

    it("positivo si el plazo está en el futuro", () => {
      expect(diasRestantes("15/01/2026", hoy)).toBe(5);
    });

    it("cero si vence hoy", () => {
      expect(diasRestantes("10/01/2026", hoy)).toBe(0);
    });

    it("negativo si ya venció", () => {
      expect(diasRestantes("05/01/2026", hoy)).toBe(-5);
    });

    it("null si la fecha es inválida", () => {
      expect(diasRestantes("no-fecha", hoy)).toBeNull();
    });

    it("ignora la hora del parámetro hoy", () => {
      const conHora = new Date(2026, 0, 10, 23, 59);
      expect(diasRestantes("15/01/2026", conHora)).toBe(5);
    });
  });

  describe("resumenPlazos", () => {
    const hoy = new Date(2026, 0, 10);

    it("separa vencidos y por vencer", () => {
      const r = resumenPlazos(
        [
          doc({ id: "v", plazo: "05/01/2026" }), // vencido
          doc({ id: "p", plazo: "13/01/2026" }), // por vencer (3 días)
          doc({ id: "f", plazo: "28/02/2026" }), // futuro lejano
        ],
        hoy,
      );
      expect(r.vencidos.map((d) => d.id)).toEqual(["v"]);
      expect(r.porVencer.map((d) => d.id)).toEqual(["p"]);
    });

    it("ignora documentos cerrados (Atendido, Archivado)", () => {
      const r = resumenPlazos(
        [
          doc({ id: "a", estado: "Atendido", plazo: "05/01/2026" }),
          doc({ id: "b", estado: "Archivado", plazo: "05/01/2026" }),
        ],
        hoy,
      );
      expect(r.vencidos).toHaveLength(0);
      expect(r.porVencer).toHaveLength(0);
    });

    it("incluye hoy en la ventana de por vencer", () => {
      const r = resumenPlazos([doc({ plazo: "10/01/2026" })], hoy);
      expect(r.porVencer).toHaveLength(1);
      expect(r.vencidos).toHaveLength(0);
    });

    it("respeta la ventana por defecto DIAS_AVISO", () => {
      const dentro = new Date(2026, 0, 10 + DIAS_AVISO);
      const fuera = new Date(2026, 0, 11 + DIAS_AVISO);
      const fmt = (d: Date) =>
        `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      const r = resumenPlazos(
        [doc({ id: "in", plazo: fmt(dentro) }), doc({ id: "out", plazo: fmt(fuera) })],
        hoy,
      );
      expect(r.porVencer.map((d) => d.id)).toEqual(["in"]);
    });

    it("acepta una ventana personalizada", () => {
      const r = resumenPlazos([doc({ plazo: "20/01/2026" })], hoy, 30);
      expect(r.porVencer).toHaveLength(1);
    });

    it("ignora documentos con plazo inválido", () => {
      const r = resumenPlazos([doc({ plazo: "no-es-fecha" })], hoy);
      expect(r.vencidos).toHaveLength(0);
      expect(r.porVencer).toHaveLength(0);
    });
  });

  describe("requiereAtencion", () => {
    const hoy = new Date(2026, 0, 10);

    it("true para vencido abierto", () => {
      expect(requiereAtencion(doc({ plazo: "05/01/2026" }), hoy)).toBe(true);
    });

    it("true para por vencer", () => {
      expect(requiereAtencion(doc({ plazo: "12/01/2026" }), hoy)).toBe(true);
    });

    it("false para futuro lejano", () => {
      expect(requiereAtencion(doc({ plazo: "28/02/2026" }), hoy)).toBe(false);
    });

    it("false para documentos cerrados", () => {
      expect(
        requiereAtencion(doc({ estado: "Atendido", plazo: "05/01/2026" }), hoy),
      ).toBe(false);
      expect(
        requiereAtencion(doc({ estado: "Archivado", plazo: "05/01/2026" }), hoy),
      ).toBe(false);
    });

    it("false si el plazo es inválido", () => {
      expect(requiereAtencion(doc({ plazo: "xx" }), hoy)).toBe(false);
    });
  });
});