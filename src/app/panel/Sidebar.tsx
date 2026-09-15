"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ClaveSeccion, Seccion } from "@/lib/secciones";
import {
  IconBandeja,
  IconCaja,
  IconCarpeta,
  IconCruz,
  IconEdificio,
  IconEngranaje,
  IconGrafico,
  IconMaletin,
  IconMas,
  IconMegafono,
  IconPersonal,
  IconProteccion,
  IconTablero,
  IconUnidad,
} from "./iconos";
import styles from "./panel.module.css";

type Enlace = {
  href: string;
  texto: string;
  icono: React.ReactNode;
  contador?: number;
  proximamente?: boolean;
};

type Grupo = { titulo: string; tono: string; enlaces: Enlace[] };

const ICONO_SECCION: Record<ClaveSeccion, React.ReactNode> = {
  administracion: <IconCarpeta />,
  "servicio-general": <IconEdificio />,
  sanidad: <IconCruz />,
  maquinas: <IconUnidad />,
  instruccion: <IconPersonal />,
  sso: <IconProteccion />,
  proyectos: <IconMaletin />,
  imagen: <IconMegafono />,
};

/**
 * La navegación del dashboard depende del rol (RF-0012): la Jefatura ve el
 * resumen y las cuatro secciones; un Jefe de Sección, solo la suya.
 */
function construirGrupos(
  secciones: Seccion[],
  jefatura: boolean,
  pendientes: number,
  inventario: boolean,
): Grupo[] {
  const dashboard: Enlace[] = jefatura
    ? [{ href: "/panel/dashboard", texto: "Resumen ejecutivo", icono: <IconGrafico /> }]
    : [];

  for (const seccion of secciones) {
    dashboard.push({
      href: seccion.ruta,
      texto: seccion.nombre,
      icono: ICONO_SECCION[seccion.clave],
    });
  }

  return [
    {
      titulo: "Bandeja Documental",
      tono: "var(--bleu)",
      enlaces: [
        {
          href: "/panel/bandeja-documental",
          texto: "Resumen",
          icono: <IconTablero />,
        },
        {
          href: "/panel/bandeja-documental/documentos",
          texto: "Documentos",
          icono: <IconBandeja />,
          contador: pendientes,
        },
      ],
    },
    ...(inventario
      ? [
          {
            titulo: "Inventario",
            tono: "var(--verde)",
            enlaces: [
              { href: "/panel/inventario", texto: "Activos y recursos", icono: <IconCaja /> },
              { href: "/panel/inventario/registrar", texto: "Registrar activo", icono: <IconMas /> },
            ],
          },
        ]
      : []),
    {
      titulo: "Dashboard ejecutivo",
      tono: "var(--ember)",
      enlaces: dashboard,
    },
    {
      titulo: "Institución",
      tono: "var(--ambar)",
      enlaces: [
        {
          href: "#",
          texto: "Configuración",
          icono: <IconEngranaje />,
          proximamente: true,
        },
      ],
    },
  ];
}

export function Sidebar({
  secciones,
  jefatura,
  pendientes,
  inventario,
}: {
  secciones: Seccion[];
  jefatura: boolean;
  /** Documentos abiertos visibles para el usuario. */
  pendientes: number;
  /** El usuario tiene al menos una sección con inventario. */
  inventario: boolean;
}) {
  const grupos = construirGrupos(secciones, jefatura, pendientes, inventario);
  const ruta = usePathname();
  // Se guarda la ruta en la que se abrió el menú: al navegar cambia la
  // ruta y el cajón se cierra solo, sin efectos ni renders en cascada.
  const [rutaDelMenu, setRutaDelMenu] = useState<string | null>(null);
  const abierto = rutaDelMenu === ruta;
  const cerrar = () => setRutaDelMenu(null);

  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setRutaDelMenu(null);
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [abierto]);

  return (
    <aside className={styles.sidebar} data-abierto={abierto}>
      {abierto && (
        <button
          type="button"
          className={styles.velo}
          onClick={cerrar}
          aria-label="Cerrar menú"
        />
      )}

      <div className={styles.marca}>
        <div className={styles.marcaEscudo}>
          <div className={styles.marcaEscudoInterior}>
            <Image
              src="/logo2.jpg"
              alt="Escudo France N°3"
              fill
              sizes="38px"
              style={{ objectFit: "cover" }}
            />
          </div>
        </div>
        <div className={styles.marcaTexto}>
          <span className={styles.marcaNombre}>France N°3</span>
          <span className={styles.marcaSub}>Gestión institucional</span>
        </div>

        <button
          type="button"
          className={styles.hamburguesa}
          onClick={() => setRutaDelMenu(abierto ? null : ruta)}
          aria-expanded={abierto}
          aria-controls="navegacion-principal"
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
        >
          <span className={styles.hamburguesaBarras} data-abierto={abierto} />
        </button>
      </div>

      <nav id="navegacion-principal" className={styles.nav}>
        {grupos.map((grupo) => (
          <div key={grupo.titulo}>
            <p className={styles.grupoTitulo}>
              <span
                className={styles.grupoPunto}
                style={{ "--tono": grupo.tono } as React.CSSProperties}
              />
              {grupo.titulo}
            </p>
            <div className={styles.navGrupo}>
              {grupo.enlaces.map((enlace) =>
                enlace.proximamente ? (
                  <span
                    key={enlace.texto}
                    className={styles.enlace}
                    style={{ opacity: 0.42, cursor: "not-allowed" }}
                    title="Disponible en una siguiente fase"
                  >
                    <span className={styles.enlaceIcono}>{enlace.icono}</span>
                    {enlace.texto}
                  </span>
                ) : (
                  <Link
                    key={enlace.href}
                    href={enlace.href}
                    className={`${styles.enlace} ${
                      ruta === enlace.href ? styles.enlaceActivo : ""
                    }`}
                    onClick={cerrar}
                  >
                    <span className={styles.enlaceIcono}>{enlace.icono}</span>
                    {enlace.texto}
                    {enlace.contador ? (
                      <span className={styles.contador}>{enlace.contador}</span>
                    ) : null}
                  </Link>
                ),
              )}
            </div>
          </div>
        ))}
      </nav>

      <div className={styles.sidebarPie}>
        Datos de las vistas en demostración
      </div>
    </aside>
  );
}
