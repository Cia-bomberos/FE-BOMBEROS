import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  activosVisibles,
  listarActivos,
  puedeRegistrarActivo,
  SECCIONES_INVENTARIO,
  seccionesInventarioDe,
} from "@/lib/inventario-repo";
import { obtenerSesion } from "@/lib/sesion";
import { IconFlecha } from "../iconos";
import { TablaInventario } from "./TablaInventario";
import styles from "../panel.module.css";

export const metadata: Metadata = { title: "Inventario" };

type Props = { searchParams: Promise<{ registrado?: string }> };

export default async function Inventario({ searchParams }: Props) {
  const bombero = await obtenerSesion();
  if (!bombero) redirect("/login");

  // `?registrado=SG-011` llega desde el formulario de registro.
  const { registrado } = await searchParams;

  // Cada rol ve su ámbito: Jefatura, todas las secciones con inventario;
  // un Jefe de Sección, solo la suya.
  const claves = seccionesInventarioDe(bombero);
  const ACTIVOS = activosVisibles(bombero, await listarActivos());
  const secciones = SECCIONES_INVENTARIO.filter((s) => claves.includes(s.clave)).map((s) => ({
    clave: s.clave,
    nombre: s.nombre,
  }));

  return (
    <div className={`${styles.contenido} ${styles.moduloInventario}`}>
      <header className={styles.encabezado}>
        <div>
          <p className={styles.migas}>
            Inventario <span data-acento="">·</span> Activos y recursos
          </p>
          <h1 className={styles.titulo}>Inventario</h1>
          <p className={styles.subtitulo}>
            {ACTIVOS.length} activos y recursos registrados
            {secciones.length === 1 ? ` en ${secciones[0].nombre}` : ""}. Cada uno
            cuenta con un identificador único, ubicación, cantidad y estado, y
            alimenta los indicadores del Dashboard Ejecutivo.
          </p>
        </div>
        {puedeRegistrarActivo(bombero) && (
          <Link className={styles.botonPrimario} href="/panel/inventario/registrar">
            Registrar activo
            <IconFlecha width={15} height={15} />
          </Link>
        )}
      </header>

      <section className={styles.tarjeta}>
        {registrado && (
          <p className={`${styles.mensaje} ${styles.mensajeOk}`} style={{ marginBottom: "1rem" }}>
            Activo registrado con el identificador {registrado}.
          </p>
        )}
        {secciones.length === 0 ? (
          <p className={styles.vacio}>Su cuenta no tiene una sección con inventario asignada.</p>
        ) : (
          <TablaInventario activos={ACTIVOS} secciones={secciones} />
        )}
      </section>
    </div>
  );
}
