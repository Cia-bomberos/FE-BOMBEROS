import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  puedeRegistrarActivo,
  SECCIONES_INVENTARIO,
  seccionesInventarioDe,
} from "@/lib/inventario-repo";
import { obtenerSesion } from "@/lib/sesion";
import { FormularioActivo } from "./FormularioActivo";
import styles from "../../panel.module.css";

export const metadata: Metadata = { title: "Registrar activo" };

export default async function RegistrarActivo() {
  const bombero = await obtenerSesion();
  if (!bombero) redirect("/login");

  if (!puedeRegistrarActivo(bombero)) {
    return (
      <div className={`${styles.contenido} ${styles.moduloInventario}`}>
        <section className={styles.tarjeta}>
          <p className={styles.vacio}>
            Su cuenta no tiene una sección con inventario; no puede registrar activos.
          </p>
        </section>
      </div>
    );
  }

  const claves = seccionesInventarioDe(bombero);
  const secciones = SECCIONES_INVENTARIO.filter((s) => claves.includes(s.clave)).map((s) => ({
    clave: s.clave,
    nombre: s.nombre,
  }));

  return (
    <div className={`${styles.contenido} ${styles.moduloInventario}`}>
      <header className={styles.encabezado}>
        <div>
          <p className={styles.migas}>
            <Link href="/panel/inventario">Inventario</Link>
            <span data-acento="">·</span> Nuevo registro
          </p>
          <h1 className={styles.titulo}>Registrar activo o recurso</h1>
        </div>
      </header>

      <section className={styles.tarjeta}>
        <FormularioActivo secciones={secciones} />
      </section>
    </div>
  );
}
