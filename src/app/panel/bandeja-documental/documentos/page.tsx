import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HOY_DEMO } from "@/lib/datos-demo";
import { listarDocumentos } from "@/lib/documentos-repo";
import {
  documentosVisibles,
  puedeRegistrar,
  veBandejaCompleta,
} from "@/lib/permisos-documentos";
import { seccionPorClave } from "@/lib/secciones";
import { obtenerSesion } from "@/lib/sesion";
import { IconFlecha } from "../../iconos";
import { TablaDocumentos } from "./TablaDocumentos";
import styles from "../../panel.module.css";

export const metadata: Metadata = { title: "Documentos" };

type Props = {
  searchParams: Promise<{
    plazo?: string;
    q?: string;
    eliminado?: string;
    seccion?: string;
  }>;
};

export default async function Bandeja({ searchParams }: Props) {
  const bombero = await obtenerSesion();
  if (!bombero) redirect("/login");

  // `?plazo=proximos` llega desde el aviso del header; `?q=` del buscador
  // global; `?seccion=` del botón por sección del sidebar (Jefatura/Admin).
  const { plazo, q, eliminado, seccion } = await searchParams;

  // Si `seccion` no es una clave válida, se ignora (se ve "todos").
  const seccionInfo = seccion ? seccionPorClave(seccion) : undefined;

  // Cada rol ve su ámbito (RF-0002): Jefatura y Administración, todo;
  // los demás Jefes de Sección, solo lo de su sección.
  let DOCUMENTOS = documentosVisibles(bombero, await listarDocumentos());

  if (seccionInfo) {
    DOCUMENTOS = DOCUMENTOS.filter((d) => d.seccion === seccionInfo.clave);
  }

  return (
    <div className={`${styles.contenido} ${styles.moduloMesa}`}>
      <header className={styles.encabezado}>
        <div>
          <h1 className={styles.titulo}>
            {seccionInfo ? `Documentos · ${seccionInfo.nombre}` : "Documentos"}
          </h1>
          <p className={styles.subtitulo}>
            {DOCUMENTOS.length} documentos{" "}
            {seccionInfo
              ? `de ${seccionInfo.nombre}`
              : veBandejaCompleta(bombero)
                ? "registrados en la compañia"
                : "de su sección"}
            .
          </p>
        </div>
        {puedeRegistrar(bombero) && (
          <Link className={styles.botonPrimario} href="/panel/bandeja-documental/registrar">
            Registrar ingreso
            <IconFlecha width={15} height={15} />
          </Link>
        )}
      </header>

      <section className={styles.tarjeta}>
        {eliminado && (
          <p className={`${styles.mensaje} ${styles.mensajeOk}`} style={{ marginBottom: "1rem" }}>
            Registro eliminado definitivamente de la plataforma.
          </p>
        )}
        <TablaDocumentos
          documentos={DOCUMENTOS}
          hoy={HOY_DEMO}
          soloPlazoInicial={plazo === "proximos"}
          busquedaInicial={q ?? ""}
        />
      </section>
    </div>
  );
}