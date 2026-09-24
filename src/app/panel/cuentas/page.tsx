import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cuentasDelCatalogo, listarCuentas } from "@/lib/cuentas-api";
import { esJefatura } from "@/lib/secciones";
import { obtenerSesion } from "@/lib/sesion";
import { IconAlerta } from "../iconos";
import { FormularioPassword } from "./FormularioPassword";
import styles from "../panel.module.css";

export const metadata: Metadata = { title: "Cuentas de sección" };

/**
 * Panel de Jefatura para las cuentas compartidas (RN-0042, RN-0043): lista
 * las cuatro cuentas de sección y permite cambiar su contraseña. La cuenta
 * de Jefatura no aparece: no puede modificarse desde aquí.
 */
export default async function Cuentas() {
  const bombero = await obtenerSesion();
  if (!bombero) redirect("/login");
  if (!esJefatura(bombero)) redirect("/panel");

  const respuesta = await listarCuentas();

  // Sin gateway (o sin red) se muestran las cuentas del catálogo local para
  // que el panel exista; cambiar la contraseña sí exige el backend.
  const cuentas = respuesta.ok ? respuesta.datos : cuentasDelCatalogo();

  return (
    <div className={styles.contenido}>
      <header className={styles.encabezado}>
        <div>
          <p className={styles.migas}>
            Institución <span data-acento="">·</span> Cuentas de sección
          </p>
          <h1 className={styles.titulo}>Cuentas de sección</h1>
          <p className={styles.subtitulo}>
            Las cuatro cuentas compartidas de la Compañía. Solo la Jefatura
            puede restablecer su contraseña; la cuenta de Jefatura no se
            modifica desde este panel.
          </p>
        </div>
      </header>

      {!respuesta.ok && (
        <p className={`${styles.mensaje} ${styles.mensajeError}`} role="alert" style={{ marginBottom: "1rem" }}>
          <IconAlerta width={14} height={14} />
          {respuesta.sinConfigurar
            ? "El API Gateway no está configurado: se muestra el catálogo local y no se pueden cambiar contraseñas."
            : `No se pudo consultar el backend (${respuesta.motivo}). Se muestra el catálogo local.`}
        </p>
      )}

      <div className={styles.rejilla}>
        {cuentas.map((cuenta) => (
          <FormularioPassword key={cuenta.username} cuenta={cuenta} />
        ))}
      </div>
    </div>
  );
}
