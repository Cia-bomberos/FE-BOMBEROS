import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listarDocumentos } from "@/lib/documentos-repo";
import {
  documentosVisibles,
  puedeRegistrar,
  veBandejaCompleta,
} from "@/lib/permisos-documentos";
import { hoyLima } from "@/lib/plazos";
import { puedeVer, seccionPorClave } from "@/lib/secciones";
import { obtenerSesion } from "@/lib/sesion";
import { IconFlecha } from "../../iconos";
import { TablaDocumentos } from "./TablaDocumentos";
import styles from "../../panel.module.css";

export const metadata: Metadata = { title: "Documentos" };

type Props = {
  readonly searchParams: Promise<{
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

  // Un Jefe de Sección que fuerza `?seccion=` de otra área por URL vuelve a
  // su propia bandeja, en vez de ver la vista ajena vacía (RN-0004).
  if (
    seccionInfo &&
    !veBandejaCompleta(bombero) &&
    !puedeVer(bombero, seccionInfo.clave)
  ) {
    redirect("/panel/bandeja-documental/documentos");
  }

  // Cada rol ve su ámbito (RF-0002): Jefatura y Administración, todo;
  // los demás Jefes de Sección, lo de su sección más lo que registraron o
  // derivaron (RN-0021, marcado como `soloLectura`).
  let DOCUMENTOS = documentosVisibles(bombero, await listarDocumentos());

  // Nota: si se filtra por `?seccion=`, el filtro mira la sección
  // RESPONSABLE ACTUAL, no la de origen. Un documento derivado desde tu
  // sección a otra no aparecerá al filtrar por la tuya: ya no está a tu
  // cargo. Es el comportamiento esperado.
  if (seccionInfo) {
    DOCUMENTOS = DOCUMENTOS.filter((d) => d.seccion === seccionInfo.clave);
  }

  const derivados = DOCUMENTOS.filter((d) => d.soloLectura).length;

  let textoAmbito = "de su sección";

  if (seccionInfo) {
    textoAmbito = `de ${seccionInfo.nombre}`;
  } else if (veBandejaCompleta(bombero)) {
    textoAmbito = "registrados en la compañia";
  }

  return (
    <div className={`${styles.contenido} ${styles.moduloMesa}`}>
      <header className={styles.encabezado}>
        <div>
          <h1 className={styles.titulo}>
            {seccionInfo ? `Documentos · ${seccionInfo.nombre}` : "Documentos"}
          </h1>
          <p className={styles.subtitulo}>
            {DOCUMENTOS.length} documentos {textoAmbito}.
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

        {derivados > 0 && !seccionInfo && (
          <p className={styles.campoAyuda} style={{ marginBottom: "1rem" }}>
            {derivados === 1
              ? "1 documento aparece en solo lectura: lo derivó a otra sección y conserva su seguimiento."
              : `${derivados} documentos aparecen en solo lectura: los derivó a otra sección y conservan su seguimiento.`}
          </p>
        )}

        <TablaDocumentos
          documentos={DOCUMENTOS}
          hoy={hoyLima()}
          soloPlazoInicial={plazo === "proximos"}
          busquedaInicial={q ?? ""}
        />
      </section>
    </div>
  );
}