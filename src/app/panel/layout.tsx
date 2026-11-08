import { redirect } from "next/navigation";
import { listarDocumentosSiDisponible } from "@/lib/documentos-repo";
import { documentosVisibles, esAdministracion } from "@/lib/permisos-documentos";
import { esJefatura, insigniaDe, seccionPorClave } from "@/lib/secciones";
import { obtenerSesion } from "@/lib/sesion";
import { obtenerTema } from "@/lib/tema-servidor";
import { salir } from "./actions";
import { BuscadorGlobal } from "./BuscadorGlobal";
import { NavegacionSuperior } from "./NavegacionSuperior";
import { PiePagina } from "./PiePagina";
import { VigilanteInactividad } from "./VigilanteInactividad";
import { ToggleTheme } from "@/components/ui/toggle-theme";
import { IconSalir } from "./iconos";
import styles from "./panel.module.css";

export default async function PanelLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const bombero = await obtenerSesion();

  if (!bombero) {
    redirect("/login");
  }

  const tema = await obtenerTema();

  const visibles = documentosVisibles(bombero, await listarDocumentosSiDisponible());
  const pendientes = visibles.filter(
    (d) => d.estado === "Pendiente" || d.estado === "En proceso",
  ).length;
  const buscables = visibles.map((d) => ({
    id: d.id,
    numero: d.numero,
    tipo: d.tipo,
    asunto: d.asunto,
    origen: d.origen,
    seccion: seccionPorClave(d.seccion)?.nombre ?? d.seccion,
    estado: d.estado,
  }));

  const navegacion = {
    jefatura: esJefatura(bombero),
    administracion: esAdministracion(bombero),
    pendientes,
    insignia: insigniaDe(bombero),
  };

  return (
    <div className={styles.app} data-theme={tema} data-panel="">
      <div className={styles.principal}>
        <header className={styles.barra}>
          <NavegacionSuperior {...navegacion} />
          <BuscadorGlobal documentos={buscables} />

          <div className={styles.acciones}>
            <ToggleTheme inicial={tema} className={styles.herramienta} />
            <div className={styles.usuario}>
              <span className={styles.avatar}>{bombero.iniciales}</span>
              <span className={styles.usuarioMeta}>
                <span className={styles.usuarioNombre}>
                  {[bombero.grado, bombero.nombre].filter(Boolean).join(" ")}
                </span>
                <span className={styles.usuarioCargo}>{bombero.cargo}</span>
              </span>
              <form action={salir}>
                <button
                  type="submit"
                  className={styles.iconoBoton}
                  aria-label="Cerrar sesión"
                  title="Cerrar sesión"
                >
                  <IconSalir width={16} height={16} />
                </button>
              </form>
            </div>
          </div>
        </header>

        {children}

        {/* Solo en móvil: pestañas pegadas al borde inferior y, al llegar al
            final de la página, el pie debajo de ellas. */}
        <NavegacionSuperior {...navegacion} ubicacion="pie" />
        <PiePagina />
      </div>

      <VigilanteInactividad />
    </div>
  );
}