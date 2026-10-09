import { describe, expect, it } from "vitest";
import { MAX_PDF, MENSAJE_PDF_GRANDE, superaMaxPdf } from "../lib/archivo-pdf";

/** Blob del tamaño pedido sin reservar la memoria. */
const deTamano = (size: number) => Object.defineProperty(new Blob(), "size", { value: size });

describe("archivo-pdf", () => {
  it("el máximo es de 20 MB (RNF-0006)", () => {
    expect(MAX_PDF).toBe(20 * 1024 * 1024);
    expect(MENSAJE_PDF_GRANDE).toBe("El archivo supera los 20 MB permitidos.");
  });

  it("acepta un archivo de exactamente 20 MB", () => {
    expect(superaMaxPdf(deTamano(MAX_PDF))).toBe(false);
  });

  it("rechaza un archivo de 20 MB más un byte", () => {
    expect(superaMaxPdf(deTamano(MAX_PDF + 1))).toBe(true);
  });

  it("rechaza un archivo de 25 MB", () => {
    expect(superaMaxPdf(deTamano(25 * 1024 * 1024))).toBe(true);
  });

  it("acepta un archivo pequeño", () => {
    expect(superaMaxPdf(new File(["%PDF-1.7"], "oficio.pdf"))).toBe(false);
  });

  it("sin archivo no lo da por excedido", () => {
    expect(superaMaxPdf(null)).toBe(false);
    expect(superaMaxPdf(undefined)).toBe(false);
  });
});
