import type { Metadata } from "next";
import { obtenerTema } from "@/lib/tema-servidor";
import { NoEncontrada } from "./panel/NoEncontrada";
import { PiePagina } from "./panel/PiePagina";
import styles from "./panel/panel.module.css";

export const metadata: Metadata = { title: "Página no encontrada" };

/**
 * 404 para URLs fuera del panel. No hay layout del panel aquí, así que se
 * envuelve en `.app` para heredar sus tokens y el tema elegido. "Ir al
 * inicio" lleva al panel, que manda al login si no hay sesión.
 */
export default async function NoEncontradaRaiz() {
  const tema = await obtenerTema();

  return (
    <div className={styles.app} data-theme={tema}>
      <div className={styles.principal}>
        <NoEncontrada principal={{ href: "/panel", texto: "Ir al inicio" }} />
        <PiePagina />
      </div>
    </div>
  );
}
