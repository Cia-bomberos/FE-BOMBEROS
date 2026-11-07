import { redirect } from "next/navigation";
import { listarDocumentosSiDisponible } from "@/lib/documentos-repo";
import { documentosVisibles, esAdministracion } from "@/lib/permisos-documentos";
import { esJefatura, insigniaDe, seccionesVisibles, seccionPorClave } from "@/lib/secciones";
import { obtenerSesion } from "@/lib/sesion";
import { obtenerTema } from "@/lib/tema-servidor";
import { salir } from "./actions";
import { BuscadorGlobal } from "./BuscadorGlobal";
import { NavegacionSeccion } from "./NavegacionSeccion";
import { Sidebar } from "./Sidebar";
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

  const jefatura = esJefatura(bombero);
  const administracion = esAdministracion(bombero);
  // Solo Jefatura y Administración tienen menú suficiente para una barra
  // lateral; las demás secciones navegan con pestañas en la barra superior.
  const conSidebar = jefatura || administracion;

  return (
    <div
      className={styles.app}
      data-theme={tema}
      data-panel=""
      data-navegacion={conSidebar ? "lateral" : "superior"}
    >
      {conSidebar && (
        <Sidebar
          secciones={seccionesVisibles(bombero)}
          jefatura={jefatura}
          administracion={administracion}
          pendientes={pendientes}
          insignia={insigniaDe(bombero)}
        />
      )}

      <div className={styles.principal}>
        <header className={styles.barra}>
          {!conSidebar && (
            <NavegacionSeccion pendientes={pendientes} insignia={insigniaDe(bombero)} />
          )}
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
      </div>

      <VigilanteInactividad />
    </div>
  );
}