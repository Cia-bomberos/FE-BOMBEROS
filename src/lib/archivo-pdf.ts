/** RNF-0006: máximo 20 MB por archivo. */
export const MAX_PDF = 20 * 1024 * 1024;

export const MENSAJE_PDF_GRANDE = "El archivo supera los 20 MB permitidos.";

/** RNF-0006: true si el archivo pasa de los 20 MB. Sin archivo, false. */
export function superaMaxPdf(archivo: Blob | null | undefined): boolean {
  return (archivo?.size ?? 0) > MAX_PDF;
}
