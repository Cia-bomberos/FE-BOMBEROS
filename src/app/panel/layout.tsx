import { redirect } from "next/navigation";
import { listarDocumentos } from "@/lib/documentos-repo";
import { puedeRegistrarActivo } from "@/lib/inventario-repo";
import { documentosVisibles, veBandejaCompleta } from "@/lib/permisos-documentos";
import { esJefatura, seccionesVisibles } from "@/lib/secciones";
import { obtenerSesion } from "@/lib/sesion";
import { obtenerTema } from "@/lib/tema-servidor";
import { salir } from "./actions";
import { AvisoPlazos } from "./AvisoPlazos";
import { RelojLima } from "./RelojLima";
import { Sidebar } from "./Sidebar";
import { ToggleTheme } from "@/components/ui/toggle-theme";
import { IconSalir } from "./iconos";
import styles from "./panel.module.css";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const bombero = await obtenerSesion();

  if (!bombero) {
    redirect("/login");
  }

  const tema = await obtenerTema();

  const visibles = documentosVisibles(bombero, await listarDocumentos());
  const pendientes = visibles.filter(
    (d) => d.estado === "Pendiente" || d.estado === "En proceso",
  ).length;

  return (
    <div className={styles.app} data-theme={tema} data-panel="">
      <Sidebar
        secciones={seccionesVisibles(bombero)}
        jefatura={esJefatura(bombero)}
        pendientes={pendientes}
        inventario={puedeRegistrarActivo(bombero)}
      />

      <div className={styles.principal}>
        <header className={styles.barra}>
          {veBandejaCompleta(bombero) && <AvisoPlazos documentos={visibles} />}

          <div className={styles.acciones}>
            <RelojLima />
            <ToggleTheme inicial={tema} />
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
    </div>
  );
}
