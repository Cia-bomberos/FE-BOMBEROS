"use client";

import { useCallback, useState } from "react";
import { COOKIE_TEMA, type Tema } from "@/lib/tema";
import { IconLuna, IconSol } from "@/app/panel/iconos";
import styles from "./toggle-theme.module.css";

export function ToggleTheme({
  inicial,
  className,
}: {
  inicial: Tema;
  className?: string;
}) {
  const [tema, setTema] = useState<Tema>(inicial);
  const siguiente: Tema = tema === "dark" ? "light" : "dark";

  const alternar = useCallback(() => {
    document
      .querySelector<HTMLElement>("[data-panel]")
      ?.setAttribute("data-theme", siguiente);
    document.cookie = `${COOKIE_TEMA}=${siguiente}; path=/; max-age=31536000; samesite=lax`;
    setTema(siguiente);
  }, [siguiente]);

  return (
    <button
      type="button"
      onClick={alternar}
      className={`${styles.boton} ${className ?? ""}`}
      aria-label={
        siguiente === "light" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"
      }
      title={siguiente === "light" ? "Tema claro" : "Tema oscuro"}
    >
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