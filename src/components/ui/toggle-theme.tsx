"use client";

import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { COOKIE_TEMA, type Tema } from "@/lib/tema";
import { IconLuna, IconSol } from "@/app/panel/iconos";
import styles from "./toggle-theme.module.css";

/**
 * Botón luna/sol con revelación circular al cambiar de tema.
 *
 * Adaptado del AnimatedThemeToggler de Magic UI, sin sus dependencias
 * (lucide, framer-motion): la revelación usa la View Transitions API del
 * navegador y el giro del icono es CSS. Donde la API no existe, el tema
 * cambia sin animación.
 *
 * Cambia `data-theme` en la raíz temable de la página (el `.app` del panel
 * o el `main` del login: el primer `[data-theme]` del documento) y guarda la
 * preferencia en la cookie `f3_tema`, que el servidor lee para pintar el
 * tema correcto en el siguiente render.
 */
export function ToggleTheme({
  inicial,
  className,
}: {
  /** Tema con el que el servidor pintó la página; evita saltos al hidratar. */
  inicial: Tema;
  className?: string;
}) {
  const botonRef = useRef<HTMLButtonElement>(null);
  const [tema, setTema] = useState<Tema>(inicial);
  const siguiente: Tema = tema === "dark" ? "light" : "dark";

  const aplicar = useCallback((nuevo: Tema) => {
    document
      .querySelector<HTMLElement>("[data-theme]")
      ?.setAttribute("data-theme", nuevo);
    document.cookie = `${COOKIE_TEMA}=${nuevo}; path=/; max-age=31536000; samesite=lax`;
    setTema(nuevo);
  }, []);

  const alternar = useCallback(async () => {
    const boton = botonRef.current;
    const reduceMovimiento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!boton || !document.startViewTransition || reduceMovimiento) {
      aplicar(siguiente);
      return;
    }

    // flushSync obliga a React a pintar el nuevo tema dentro del callback,
    // que es cuando la API toma la captura del estado "nuevo".
    await document.startViewTransition(() => {
      flushSync(() => aplicar(siguiente));
    }).ready;

    const { left, top, width, height } = boton.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const radio = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${radio}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 650,
        easing: "cubic-bezier(0.22, 0.9, 0.28, 1)",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  }, [aplicar, siguiente]);

  return (
    <button
      ref={botonRef}
      type="button"
      onClick={alternar}
      className={`${styles.boton} ${className ?? ""}`}
      aria-label={
        siguiente === "light" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"
      }
      title={siguiente === "light" ? "Tema claro" : "Tema oscuro"}
    >
      {/* La `key` remonta el icono al cambiar: así vuelve a correr su animación. */}
      <span key={tema} className={styles.icono}>
        {tema === "dark" ? (
          <IconLuna width={16} height={16} />
        ) : (
          <IconSol width={16} height={16} />
        )}
      </span>
    </button>
  );
}
