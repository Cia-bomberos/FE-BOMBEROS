import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HOY_DEMO } from "@/lib/datos-demo";
import { puedeRegistrar, seccionesParaRegistrar } from "@/lib/permisos-documentos";
import { SECCIONES } from "@/lib/secciones";
import { obtenerSesion } from "@/lib/sesion";
import { FormularioRegistro } from "./FormularioRegistro";
import styles from "../../panel.module.css";

export const metadata: Metadata = { title: "Registrar documento" };

export default async function RegistrarDocumento() {
  const bombero = await obtenerSesion();
  if (!bombero) redirect("/login");

  if (!puedeRegistrar(bombero)) {
    return (
      <div className={`${styles.contenido} ${styles.moduloMesa}`}>
        <section className={styles.tarjeta}>
          <p className={styles.vacio}>
            Su cuenta no tiene una sección asignada; no puede registrar documentos.
          </p>
        </section>
      </div>
    );
  }

  const claves = seccionesParaRegistrar(bombero);
  const secciones = SECCIONES.filter((s) => claves.includes(s.clave)).map((s) => ({
    clave: s.clave,
    nombre: s.nombre,
  }));

  return (
    <div className={`${styles.contenido} ${styles.moduloMesa}`}>
      <header className={styles.encabezado}>
        <div>
          <p className={styles.migas}>
            <Link href="/panel/bandeja-documental/documentos">Documentos</Link>
            <span data-acento="">·</span> Nuevo ingreso
          </p>
          <h1 className={styles.titulo}>Registrar documento</h1>
        </div>
      </header>

      <section className={styles.tarjeta}>
        <FormularioRegistro secciones={secciones} hoy={HOY_DEMO} />
      </section>
    </div>
  );
}
