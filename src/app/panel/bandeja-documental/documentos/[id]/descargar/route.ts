import { NextResponse, type NextRequest } from "next/server";
import { obtenerDocumento, urlDescarga } from "@/lib/documentos-repo";
import { puedeVerDocumento } from "@/lib/permisos-documentos";
import { obtenerSesion } from "@/lib/sesion";

/**
 * Descarga del PDF original (RN-0023). El bucket es privado: se pide al
 * backend una URL pre-firmada de corta vida y el archivo se sirve desde este
 * mismo origen. No se redirige a S3 porque el botón descarga con `fetch`, y
 * seguir la redirección lo bloquean la CSP (`connect-src 'self'`) y el CORS
 * del bucket. El cuerpo se reenvía en streaming, sin cargarlo en memoria.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const bombero = await obtenerSesion();
  if (!bombero) return NextResponse.redirect(new URL("/login", request.url));

  const { id } = await params;
  const documento = await obtenerDocumento(id).catch(() => null);
  if (!documento || !puedeVerDocumento(bombero, documento)) {
    return new NextResponse("Documento no encontrado.", { status: 404 });
  }

  try {
    const archivo = await fetch(await urlDescarga(id), { cache: "no-store" });
    if (!archivo.ok || !archivo.body) throw new Error(String(archivo.status));

    const nombre = `${documento.numero || id}.pdf`;
    return new NextResponse(archivo.body, {
      headers: {
        "Content-Type": archivo.headers.get("content-type") ?? "application/pdf",
        "Content-Disposition": `attachment; filename="${nombre.replace(/[^\w.-]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("No se pudo obtener el archivo. Intente nuevamente.", { status: 502 });
  }
}
