import { NextResponse } from "next/server";

/**
 * Sirve el PDF desde este mismo origen. El bucket es privado: se pide al
 * backend una URL pre-firmada de corta vida y el cuerpo se reenvía en
 * streaming, sin cargarlo en memoria. No se redirige a S3 porque lo bloquea la
 * CSP y el CORS del bucket.
 */
export async function responderPdf(
  obtenerUrl: () => Promise<string>,
  nombre: string,
  disposicion: "attachment" | "inline",
) {
  try {
    const archivo = await fetch(await obtenerUrl(), { cache: "no-store" });
    if (!archivo.ok || !archivo.body) throw new Error(String(archivo.status));

    return new NextResponse(archivo.body, {
      headers: {
        // Fijo y con `nosniff`: el navegador nunca interpreta el archivo como otra cosa.
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `${disposicion}; filename="${nombre.replace(/[^\w.-]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("No se pudo obtener el archivo. Intente nuevamente.", { status: 502 });
  }
}
