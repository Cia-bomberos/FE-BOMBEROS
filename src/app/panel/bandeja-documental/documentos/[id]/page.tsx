import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { obtenerDocumento } from "@/lib/documentos-repo";
import {
  puedeEliminar,
  puedeGestionarDocumento,
  puedeVerDocumento,
  SECCIONES_BANDEJA,
} from "@/lib/permisos-documentos";
import { SECCIONES, seccionPorClave } from "@/lib/secciones";
import { obtenerSesion } from "@/lib/sesion";
import { EtiquetaEstado, EtiquetaPrioridad } from "../../Etiquetas";
import { IconDescarga } from "../../../iconos";
import { AccionesDocumento } from "./AccionesDocumento";
import { EliminarArchivado } from "./EliminarArchivado";
import styles from "../../../panel.module.css";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const documento = await obtenerDocumento(id);
  return { title: documento?.numero ?? "Documento" };
}

export default async function DetalleDocumento({ params }: Readonly<Props>) {
  const bombero = await obtenerSesion();
  if (!bombero) redirect("/login");

  const { id } = await params;
  const documento = await obtenerDocumento(id);

  // Un documento de otra sección se trata como inexistente (RN-0004).
  if (!documento || !puedeVerDocumento(bombero, documento)) {
    notFound();
  }

  const gestiona = puedeGestionarDocumento(bombero, documento);
  const secciones = SECCIONES.filter((s) => SECCIONES_BANDEJA.includes(s.clave)).map((s) => ({
    clave: s.clave,
    nombre: s.nombre,
  }));
  const externo = documento.modalidad === "simplificado";

  return (
    <div className={`${styles.contenido} ${styles.moduloMesa}`}>
      <header className={styles.encabezado}>
        <div>
          <p className={styles.migas}>
            <Link href="/panel/bandeja-documental/documentos">Documentos</Link>
            <span data-acento="">·</span> {documento.tipo}
          </p>
          <h1 className={styles.titulo}>{documento.numero}</h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <EtiquetaPrioridad prioridad={documento.prioridad} />
          <EtiquetaEstado estado={documento.estado} />
          {documento.adjunto ? (
            // Route Handler: pide la URL pre-firmada y redirige a S3 (RN-0023).
            <a
              className={styles.botonSecundario}
              href={`/panel/bandeja-documental/documentos/${documento.id}/descargar`}
            >
              <IconDescarga width={14} height={14} />
              Descargar
            </a>
          ) : (
            <button
              type="button"
              className={styles.botonSecundario}
              disabled
              title="Este documento no tiene archivo adjunto"
            >
              <IconDescarga width={14} height={14} />
              Descargar
            </button>
          )}
        </div>
      </header>

      <div className={styles.detalle}>
        <section className={styles.tarjeta}>
          <p className={styles.asuntoDestacado}>{documento.asunto || "Sin asunto registrado"}</p>

          <div className={styles.ficha}>
            {[
              ["Remitente", documento.origen],
              ["Área responsable", documento.destino],
              ["Vía de ingreso", documento.via],
              ["Folios", documento.folios ? `${documento.folios}` : "—"],
              ["Fecha de ingreso", documento.fechaIngreso],
              ["Plazo de atención", documento.plazo],
              ["Código único", externo ? "No aplica (externo)" : documento.numero],
              ["Tipo documental", documento.tipo],
              ["Sección responsable", seccionPorClave(documento.seccion)?.nombre ?? documento.seccion],
              [
                "Prioridad",
                `${documento.prioridad}${documento.prioridadManual ? " (manual)" : " (por plazo)"}`,
              ],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta} className={styles.fichaDato}>
                <span className={styles.fichaEtiqueta}>{etiqueta}</span>
                <span className={styles.fichaValor}>{valor}</span>
              </div>
            ))}
          </div>

          <div className={styles.adjunto} style={{ marginTop: "1.25rem" }}>
            <IconDescarga width={16} height={16} />
            {documento.adjunto ? (
              <span>
                {documento.adjunto.nombre}
                <small>
                  {documento.adjunto.tamano} · actualizado {documento.adjunto.actualizado}
                </small>
              </span>
            ) : (
              <span>
                Sin archivo adjunto
              </span>
            )}
          </div>

          {!gestiona && (
            <p className={styles.campoAyuda} style={{ marginTop: "1rem" }}>
              Consulta en solo lectura: este documento pertenece a otra sección.
            </p>
          )}
        </section>

        <section className={`${styles.tarjeta} ${styles.trazabilidad}`}>
          <div className={styles.tarjetaEncabezado}>
            <h2 className={styles.tarjetaTitulo}>Trazabilidad</h2>
          </div>

          <div className={styles.linea}>
            {documento.trazabilidad.map((etapa, i) => (
              <div key={`${i}-${etapa.etapa}`} className={styles.lineaItem}>
                <span
                  className={`${styles.lineaPunto} ${
                    etapa.completada ? styles.lineaPuntoHecho : ""
                  }`}
                />
                <div className={styles.lineaContenido}>
                  <span
                    className={`${styles.lineaEtapa} ${
                      etapa.completada ? "" : styles.pendienteTexto
                    }`}
                  >
                    {etapa.etapa}
                  </span>
                  <span className={styles.lineaMeta}>
                    {etapa.completada
                      ? `${etapa.fecha} · ${etapa.hora} · ${etapa.responsable}`
                      : "Pendiente"}
                  </span>
                  <span className={styles.lineaDetalle}>{etapa.detalle}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {gestiona && (
        <AccionesDocumento documento={documento} secciones={secciones} />
      )}

      {puedeEliminar(bombero, documento) && (
        <EliminarArchivado id={documento.id} numero={documento.numero} />
      )}
    </div>
  );
}
