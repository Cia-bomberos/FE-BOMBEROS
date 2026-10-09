import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { esPdfValido } from "../lib/validar-pdf";

async function pdfReal(paginas = 1): Promise<Blob> {
  const documento = await PDFDocument.create();
  for (let i = 0; i < paginas; i++) documento.addPage();
  return new Blob([new Uint8Array(await documento.save())], { type: "application/pdf" });
}

/** Cabecera "%PDF-" seguida de bytes aleatorios. */
function cabeceraConBasura(tamano = 4096): Blob {
  const basura = new Uint8Array(tamano);
  crypto.getRandomValues(basura);
  return new Blob([new TextEncoder().encode("%PDF-1.7\n"), basura]);
}

describe("esPdfValido (RNF-0007)", () => {
  it("acepta un PDF real", async () => {
    expect(await esPdfValido(await pdfReal())).toBe(true);
  });

  it("acepta un PDF de varias páginas", async () => {
    expect(await esPdfValido(await pdfReal(3))).toBe(true);
  });

  it("rechaza la cabecera %PDF- seguida de contenido aleatorio", async () => {
    // Varias muestras: con basura aleatoria el fallo puede darse al
    // abrir el documento o al recorrer sus páginas.
    for (let i = 0; i < 20; i++) {
      expect(await esPdfValido(cabeceraConBasura())).toBe(false);
    }
  });

  it("rechaza la cabecera %PDF- seguida de texto", async () => {
    expect(await esPdfValido(new Blob(["%PDF-1.7 contenido"]))).toBe(false);
  });

  it("rechaza un archivo con solo cabecera y fin de archivo", async () => {
    expect(await esPdfValido(new Blob(["%PDF-1.4\n%%EOF"]))).toBe(false);
  });

  it("rechaza un PDF real truncado", async () => {
    const completo = new Uint8Array(await (await pdfReal()).arrayBuffer());
    expect(await esPdfValido(new Blob([completo.subarray(0, 40)]))).toBe(false);
  });

  it("rechaza un archivo sin la firma %PDF- (p. ej. una imagen renombrada)", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(await esPdfValido(new Blob([png]))).toBe(false);
  });

  it("rechaza un PDF real con la firma alterada", async () => {
    const bytes = new Uint8Array(await (await pdfReal()).arrayBuffer());
    bytes[0] = 0x00;
    expect(await esPdfValido(new Blob([bytes]))).toBe(false);
  });

  it("rechaza un archivo vacío", async () => {
    expect(await esPdfValido(new Blob([]))).toBe(false);
  });
});
