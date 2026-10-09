import { PDFDocument } from "pdf-lib";

/**
 * RNF-0007: true si el contenido es realmente un PDF legible. La firma
 * "%PDF-" sola no basta: se abre el documento y debe tener al menos una
 * página. Los PDF protegidos con contraseña se aceptan (no se descifran).
 */
export async function esPdfValido(archivo: Blob): Promise<boolean> {
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") return false;

  try {
    // Con contenido corrupto `load` a veces no falla y el error salta
    // recién al recorrer las páginas: ambas cosas van dentro del try.
    const documento = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    return documento.getPageCount() > 0;
  } catch {
    return false;
  }
}
