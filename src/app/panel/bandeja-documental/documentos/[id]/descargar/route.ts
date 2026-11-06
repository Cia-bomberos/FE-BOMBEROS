import { NextResponse, type NextRequest } from "next/server";
import { obtenerDocumento, urlDescarga } from "@/lib/documentos-repo";
import { puedeVerDocumento } from "@/lib/permisos-documentos";
import { obtenerSesion } from "@/lib/sesion";
import { responderPdf } from "../responder-pdf";

/** Descarga del PDF original (RN-0023). El backend la registra (RN-0027). */
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

  return responderPdf(() => urlDescarga(id), `${documento.numero || id}.pdf`, "attachment");
}
