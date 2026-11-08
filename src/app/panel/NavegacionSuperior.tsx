"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { ClaveSeccion, Insignia } from "@/lib/secciones";
import {
  IconBandeja,
  IconChevron,
  IconCruz,
  IconEdificio,
  IconEngranaje,
  IconMaletin,
  IconPersonal,
  IconTablero,
  IconUnidad,
} from "./iconos";
import styles from "./panel.module.css";

const RESUMEN = "/panel/bandeja-documental";
const DOCUMENTOS = `${RESUMEN}/documentos`;
const CUENTAS = "/panel/cuentas";
const RESPALDO = "/panel/configuracion/drive";

/** Las 4 secciones que Jefatura y Administración pueden filtrar en la bandeja. */
const SECCIONES_BANDEJA: { clave: ClaveSeccion; nombre: string; icono: React.ReactNode }[] = [
  { clave: "administracion", nombre: "Administración", icono: <IconMaletin /> },
  { clave: "servicio-general", nombre: "Servicio General", icono: <IconEdificio /> },
  { clave: "sanidad", nombre: "Sanidad", icono: <IconCruz /> },
  { clave: "maquinas", nombre: "Máquinas", icono: <IconUnidad /> },
];

/**
 * Identidad y pestañas del panel. El layout la pinta dos veces: en la barra
 * superior (`ubicacion="barra"`, con la marca) y al final de la página
 * (`ubicacion="pie"`, solo las pestañas). El CSS muestra una u otra según el
 * ancho: en pantallas chicas las pestañas van abajo, pegadas al borde
 * mientras se hace scroll, y el pie de página queda debajo de ellas.
 */
export function NavegacionSuperior({
  jefatura,
  administracion,
  pendientes,
  insignia,
  ubicacion = "barra",
}: Readonly<{
  jefatura: boolean;
  /** Jefe de Administración: ve la bandeja completa igual que Jefatura. */
  administracion: boolean;
  /** Documentos abiertos visibles para el usuario. */
  pendientes: number;
  /** Logo de la sección del usuario; sin sección (Jefatura) se ve el escudo. */
  insignia: Insignia | null;
  /** "barra": marca + pestañas arriba. "pie": solo pestañas, para móvil. */
  ubicacion?: "barra" | "pie";
}>) {
  const ruta = usePathname();
  // Jefatura y Administración ven la bandeja completa (RF-0002): para ellos,
  // Documentos se abre en un menú separado por sección.
  const vistaCompleta = jefatura || administracion;

  // Todo lo que cuelga de la bandeja (detalle, registrar) pertenece a Documentos.
  const enResumen = ruta === RESUMEN;
  const enDocumentos = ruta.startsWith(`${RESUMEN}/`);
  const enCuentas = ruta.startsWith(CUENTAS);
  const enRespaldo = ruta.startsWith(RESPALDO);

  // Mismo orden en que se pintan las pestañas: el riel se ubica por su índice.
  const activas = [
    enResumen,
    enDocumentos,
    ...(jefatura ? [enCuentas] : []),
    ...(administracion ? [enRespaldo] : []),
  ];
  const posicion = activas.indexOf(true);

  const pestanas = (
    <nav
      className={
        ubicacion === "pie" ? `${styles.navSuperior} ${styles.navPie}` : styles.navSuperior
      }
      aria-label="Navegación principal"
    >
      <Pestana href={RESUMEN} activa={enResumen} icono={<IconTablero />} texto="Resumen" />

      {vistaCompleta ? (
        <MenuDocumentos activa={enDocumentos} pendientes={pendientes} />
      ) : (
        <Pestana
          href={DOCUMENTOS}
          activa={enDocumentos}
          icono={<IconBandeja />}
          texto="Documentos"
          contador={pendientes}
        />
      )}

      {/* Solo Jefatura administra las cuentas compartidas (RN-0042). */}
      {jefatura && (
        <Pestana href={CUENTAS} activa={enCuentas} icono={<IconPersonal />} texto="Cuentas" />
      )}
      {administracion && (
        <Pestana href={RESPALDO} activa={enRespaldo} icono={<IconEngranaje />} texto="Respaldo" />
      )}

      {posicion >= 0 && (
        <span
          className={styles.navSuperiorRiel}
          style={{ "--pestanas": activas.length, "--posicion": posicion } as React.CSSProperties}
          aria-hidden="true"
        />
      )}
    </nav>
  );

  if (ubicacion === "pie") return pestanas;

  return (
    <>
      <div className={styles.marcaSuperior}>
        <div className={styles.marcaInsignia}>
          <Image
            src={insignia?.src ?? "/insignias/jefatura.png"}
            alt={insignia?.alt ?? "Escudo France N°3"}
            fill
            sizes="40px"
            style={{ objectFit: "contain" }}
          />
        </div>
        <div className={styles.marcaTexto}>
          <span className={styles.marcaNombre}>France N°3</span>
          <span className={styles.marcaSub}>Gestión institucional</span>
        </div>
      </div>

      {pestanas}
    </>
  );
}

function Pestana({
  href,
  activa,
  icono,
  texto,
  contador = 0,
}: Readonly<{
  href: string;
  activa: boolean;
  icono: React.ReactNode;
  texto: string;
  contador?: number;
}>) {
  return (
    <Link
      href={href}
      className={styles.navSuperiorEnlace}
      data-activa={activa}
      aria-current={activa ? "page" : undefined}
    >
      {icono}
      {texto}
      <Contador valor={contador} />
    </Link>
  );
}

function Contador({ valor }: Readonly<{ valor: number }>) {
  if (valor <= 0) return null;
  return (
    <span className={styles.contador} title="Documentos abiertos">
      {valor}
    </span>
  );
}

function MenuDocumentos({
  activa,
  pendientes,
}: Readonly<{ activa: boolean; pendientes: number }>) {
  const ruta = usePathname();
  const seccionActiva = useSearchParams().get("seccion");
  const [abierto, setAbierto] = useState(false);
  const grupo = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const idMenu = useId();

  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      setAbierto(false);
      boton.current?.focus();
    };
    const alPulsarFuera = (evento: PointerEvent) => {
      if (!grupo.current?.contains(evento.target as Node)) setAbierto(false);
    };
    document.addEventListener("keydown", alPresionar);
    document.addEventListener("pointerdown", alPulsarFuera);
    return () => {
      document.removeEventListener("keydown", alPresionar);
      document.removeEventListener("pointerdown", alPulsarFuera);
    };
  }, [abierto]);

  // Salir con el tabulador también lo cierra. Sin destino (clic en un área
  // sin foco) no hace nada: de eso se encarga el `pointerdown`.
  const alPerderFoco = (evento: React.FocusEvent<HTMLDivElement>) => {
    const destino = evento.relatedTarget;
    if (destino && !evento.currentTarget.contains(destino)) setAbierto(false);
  };

  const enLista = ruta === DOCUMENTOS;
  const cerrar = () => setAbierto(false);

  return (
    <div className={styles.navSuperiorGrupo} ref={grupo} onBlur={alPerderFoco}>
      <button
        ref={boton}
        type="button"
        className={styles.navSuperiorEnlace}
        data-activa={activa}
        aria-expanded={abierto}
        aria-controls={idMenu}
        onClick={() => setAbierto((actual) => !actual)}
      >
        <IconBandeja />
        Documentos
        <Contador valor={pendientes} />
        <IconChevron className={styles.navSuperiorChevron} width={12} height={12} />
      </button>

      {abierto && (
        <ul id={idMenu} className={styles.navSuperiorMenu}>
          <Opcion
            href={DOCUMENTOS}
            activa={enLista && !seccionActiva}
            icono={<IconBandeja />}
            texto="Todos los Documentos"
            alElegir={cerrar}
          />
          {SECCIONES_BANDEJA.map(({ clave, nombre, icono }) => (
            <Opcion
              key={clave}
              href={`${DOCUMENTOS}?seccion=${clave}`}
              activa={enLista && seccionActiva === clave}
              icono={icono}
              texto={nombre}
              alElegir={cerrar}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function Opcion({
  href,
  activa,
  icono,
  texto,
  alElegir,
}: Readonly<{
  href: string;
  activa: boolean;
  icono: React.ReactNode;
  texto: string;
  alElegir: () => void;
}>) {
  return (
    <li>
      <Link
        href={href}
        className={styles.navSuperiorOpcion}
        aria-current={activa ? "page" : undefined}
        onClick={alElegir}
      >
        {icono}
        {texto}
      </Link>
    </li>
  );
}
