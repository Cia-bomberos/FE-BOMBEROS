import { NextResponse, type NextRequest } from "next/server";
import { obtenerDocumento, urlVistaPrevia } from "@/lib/documentos-repo";
import { puedeVerDocumentoDerivado } from "@/lib/permisos-documentos";
import { obtenerSesion } from "@/lib/sesion";
import { responderPdf } from "../responder-pdf";

/**
 * PDF para el visor del detalle: no cuenta como descarga (RN-0027). `proxy.ts`
 * permite solo a esta ruta mostrarse en un iframe del propio sitio.
 *
 * Los mismos permisos que la página de detalle: la sección de origen también
 * lo consulta en solo lectura (RN-0021).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const bombero = await obtenerSesion();
  if (!bombero) return NextResponse.redirect(new URL("/login", request.url));

  const { id } = await params;
  const documento = await obtenerDocumento(id).catch(() => null);
  if (!documento?.adjunto || !puedeVerDocumentoDerivado(bombero, documento)) {
    return new NextResponse("Documento no encontrado.", { status: 404 });
  }

  return responderPdf(() => urlVistaPrevia(id), `${documento.numero || id}.pdf`, "inline");
}
