import Link from "next/link";
import { IconFlecha } from "./iconos";
import styles from "./panel.module.css";

type Enlace = { readonly href: string; readonly texto: string };

type Props = {
  readonly principal: Enlace;
  readonly secundario?: Enlace;
};

/**
 * Contenido del 404: lo comparten el del panel (con la barra superior) y el
 * raíz (URLs fuera del panel). Las acciones cambian según dónde se muestra;
 * el pie lo pone el layout del panel o, fuera de él, el 404 raíz.
 */
export function NoEncontrada({ principal, secundario }: Props) {
  return (
    <div className={`${styles.contenido} ${styles.moduloMesa}`}>
      <section className={styles.noEncontrada} aria-labelledby="titulo-404">
        <span className={styles.noEncontradaCodigo} aria-hidden="true">
          404
        </span>
        <p className={styles.migas}>
          Error <span data-acento="">·</span> Página no encontrada
        </p>
        <h1 id="titulo-404" className={styles.titulo}>
          Esta página no existe
        </h1>
        <p className={styles.noEncontradaTexto}>
          La dirección que abriste no existe, cambió o el documento ya no está
          disponible para tu sección.
        </p>
        <div className={styles.noEncontradaAcciones}>
          <Link className={styles.botonPrimario} href={principal.href}>
            {principal.texto}
            <IconFlecha width={15} height={15} />
          </Link>
          {secundario && (
            <Link className={styles.botonSecundario} href={secundario.href}>
              {secundario.texto}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
