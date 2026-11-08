import styles from "./panel.module.css";

/**
 * Pie minimalista para cerrar páginas con poco contenido: una línea fina
 * pegada al fondo del área de contenido con el nombre de la Compañía.
 */
export function PiePagina() {
  return (
    <footer className={styles.pie}>
      <span>Compañía de Bomberos Voluntarios France N°3</span>
      <span className={styles.pieSub}>Gestión institucional · {new Date().getFullYear()}</span>
    </footer>
  );
}
