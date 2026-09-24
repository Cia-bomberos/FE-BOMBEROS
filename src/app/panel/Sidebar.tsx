"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { ClaveSeccion, Seccion } from "@/lib/secciones";
import {
  IconBandeja,
  IconCaja,
  IconCruz,
  IconEdificio,
  IconEngranaje,
  IconMas,
  IconPersonal,
  IconTablero,
  IconUnidad,
} from "./iconos";
import styles from "./panel.module.css";

const inventarioHabilitado = false;

type Enlace = {
  href: string;
  texto: string;
  icono: React.ReactNode;
  contador?: number;
  proximamente?: boolean;
  /** Si el link filtra la bandeja por sección, su clave (para resaltar el activo). */
  seccion?: ClaveSeccion;
};

type Grupo = { titulo: string; tono: string; enlaces: Enlace[] };

/** Las 3 secciones operativas con botón propio en la bandeja (fuera de Administración). */
const SECCIONES_BANDEJA: { clave: ClaveSeccion; nombre: string; icono: React.ReactNode }[] = [
  { clave: "servicio-general", nombre: "Servicio General", icono: <IconEdificio /> },
  { clave: "sanidad", nombre: "Sanidad", icono: <IconCruz /> },
  { clave: "maquinas", nombre: "Máquinas", icono: <IconUnidad /> },
];

function construirGrupos(
  jefatura: boolean,
  administracion: boolean,
  pendientes: number,
  inventario: boolean,
): Grupo[] {
  // Jefatura y Administración ven la bandeja completa (RF-0002): para
  // ellos, "Documentos" se abre en botones separados por sección.
  const vistaCompleta = jefatura || administracion;

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
          texto: vistaCompleta ? "Todos los documentos" : "Documentos",
          icono: <IconBandeja />,
          contador: pendientes,
        },
        ...(vistaCompleta
          ? SECCIONES_BANDEJA.map(({ clave, nombre, icono }) => ({
              href: `/panel/bandeja-documental/documentos?seccion=${clave}`,
              texto: nombre,
              icono,
              seccion: clave,
            }))
          : []),
      ],
    },
    // Inventario: se oculta para Jefatura, se muestra para el resto si aplica.
    ...(inventario && !jefatura && inventarioHabilitado
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
      titulo: "Institución",
      tono: "var(--ambar)",
      enlaces: [
        // Solo Jefatura administra las cuentas compartidas (RN-0042).
        ...(jefatura
          ? [{ href: "/panel/cuentas", texto: "Cuentas de sección", icono: <IconPersonal /> }]
          : []),
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
  secciones: _secciones,
  jefatura,
  administracion,
  pendientes,
  inventario,
}: {
  secciones: Seccion[];
  jefatura: boolean;
  /** Jefe de Administración: ve la bandeja completa igual que Jefatura. */
  administracion: boolean;
  /** Documentos abiertos visibles para el usuario. */
  pendientes: number;
  /** El usuario tiene al menos una sección con inventario. */
  inventario: boolean;
}) {
  const grupos = construirGrupos(jefatura, administracion, pendientes, inventario);
  const ruta = usePathname();
  const parametros = useSearchParams();
  const seccionActiva = parametros.get("seccion");

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

  // Un enlace está activo si coincide la ruta y, cuando el enlace filtra
  // por sección, también coincide (o ambos son "sin sección" = todos).
  const esActivo = (enlace: Enlace) => {
    const [base] = enlace.href.split("?");
    if (ruta !== base) return false;
    return (enlace.seccion ?? null) === seccionActiva;
  };

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
                      esActivo(enlace) ? styles.enlaceActivo : ""
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