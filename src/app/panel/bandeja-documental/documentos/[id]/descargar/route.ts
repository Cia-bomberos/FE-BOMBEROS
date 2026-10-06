import { NextResponse, type NextRequest } from "next/server";
import { obtenerDocumento, urlDescarga } from "@/lib/documentos-repo";
import { puedeVerDocumento } from "@/lib/permisos-documentos";
import { obtenerSesion } from "@/lib/sesion";

/**
 * Descarga del PDF original (RN-0023). El bucket es privado: se pide al
 * backend una URL pre-firmada de corta vida y se redirige a ella, así el
 * archivo viaja de S3 al navegador sin pasar por este servidor.
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
    return NextResponse.redirect(await urlDescarga(id));
  } catch {
    return new NextResponse("No se pudo obtener el archivo. Intente nuevamente.", { status: 502 });
  }
}
