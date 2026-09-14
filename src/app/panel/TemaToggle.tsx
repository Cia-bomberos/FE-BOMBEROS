"use client";

import { useState } from "react";
import { COOKIE_TEMA, type Tema } from "@/lib/tema";
import { IconLuna, IconSol } from "./iconos";
import styles from "./panel.module.css";

/**
 * Luna/sol del header. Cambia el atributo del panel en el acto y deja la
 * preferencia en cookie (un año) para que el servidor la respete después.
 */
export function TemaToggle({ inicial }: { inicial: Tema }) {
  const [tema, setTema] = useState<Tema>(inicial);
  const siguiente: Tema = tema === "dark" ? "light" : "dark";

  const cambiar = () => {
    document
      .querySelector<HTMLElement>("[data-panel]")
      ?.setAttribute("data-theme", siguiente);
    document.cookie = `${COOKIE_TEMA}=${siguiente}; path=/; max-age=31536000; samesite=lax`;
    setTema(siguiente);
  };

  return (
    <button
      type="button"
      className={styles.iconoBoton}
      onClick={cambiar}
      aria-label={siguiente === "light" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={siguiente === "light" ? "Tema claro" : "Tema oscuro"}
    >
      {tema === "dark" ? (
        <IconLuna width={16} height={16} />
      ) : (
        <IconSol width={16} height={16} />
      )}
    </button>
  );
}
