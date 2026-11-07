"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Insignia } from "@/lib/secciones";
import { IconBandeja, IconTablero } from "./iconos";
import styles from "./panel.module.css";

const RESUMEN = "/panel/bandeja-documental";
const DOCUMENTOS = `${RESUMEN}/documentos`;

type Pestana = "resumen" | "documentos";

/** Todo lo que cuelga de la bandeja (detalle, registrar) pertenece a Documentos. */
function pestanaActiva(ruta: string): Pestana | null {
  if (ruta === RESUMEN) return "resumen";
  if (ruta.startsWith(`${RESUMEN}/`)) return "documentos";
  return null;
}

/**
 * Identidad y pestañas de las secciones sin vista completa: con solo dos
 * destinos no necesitan barra lateral. Vive dentro de la barra superior; en
 * pantallas chicas las pestañas bajan a una barra fija al pie.
 */
export function NavegacionSeccion({
  pendientes,
  insignia,
}: Readonly<{
  /** Documentos abiertos visibles para el usuario. */
  pendientes: number;
  /** Logo de la sección del usuario; sin él se ve el escudo. */
  insignia: Insignia | null;
}>) {
  const activa = pestanaActiva(usePathname());

  return (
    <>
      <div className={styles.marcaSeccion}>
        <div className={styles.marcaInsignia}>
          <Image
            src={insignia?.src ?? "/insignias/jefatura.png"}
            alt={insignia?.alt ?? "Escudo France N°3"}
            fill
            sizes="40px"
            style={{ objectFit: "contain" }}
          />
        </div>
        <div className={styles.marcaTexto}>
          <span className={styles.marcaNombre}>France N°3</span>
          <span className={styles.marcaSub}>Gestión institucional</span>
        </div>
      </div>

      <nav className={styles.navSeccion} aria-label="Bandeja Documental">
        <Link
          href={RESUMEN}
          className={styles.navSeccionEnlace}
          aria-current={activa === "resumen" ? "page" : undefined}
        >
          <IconTablero />
          Resumen
        </Link>
        <Link
          href={DOCUMENTOS}
          className={styles.navSeccionEnlace}
          aria-current={activa === "documentos" ? "page" : undefined}
        >
          <IconBandeja />
          Documentos
          {pendientes > 0 && (
            <span className={styles.contador} title="Documentos abiertos">
              {pendientes}
            </span>
          )}
        </Link>
        <span className={styles.navSeccionRiel} data-activa={activa ?? undefined} aria-hidden="true" />
      </nav>
    </>
  );
}
