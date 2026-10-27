import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/sesion";
import { obtenerConfiguracionDrive } from "@/lib/configuracion-drive";
import { FormularioDrive } from "./FormularioDrive";
import styles from "../../panel.module.css";

export const metadata: Metadata = { title: "Configuración de Drive" };

export default async function ConfiguracionDrivePage() {
  const bombero = await obtenerSesion();
  if (!bombero) redirect("/login");

  // Aquí podrías verificar si el usuario es Jefe de Administración, 
  // aunque el backend ya lo valida y lanzaría un 403.

  let config = null;
  let errorCarga = "";

  try {
    config = await obtenerConfiguracionDrive();
  } catch (e: any) {
    errorCarga = "No se pudo cargar la configuración actual de Drive.";
  }

  return (
    <div className={`${styles.contenido} ${styles.moduloMesa}`}>
      <header className={styles.encabezado}>
        <div>
          <h1 className={styles.titulo}>Configuración de Drive</h1>
          <p className={styles.subtitulo}>
            Gestione la carpeta donde se respaldarán los documentos archivados.
          </p>
        </div>
      </header>

      {errorCarga ? (
        <p className={styles.mensajeError}>{errorCarga}</p>
      ) : (
        <FormularioDrive 
          configInicial={{
            enlace: config?.enlace || null,
            carpeta_nombre: config?.carpeta_nombre || null,
            cuenta_respaldo: config?.cuenta_respaldo || null,
          }} 
        />
      )}
    </div>
  );
}