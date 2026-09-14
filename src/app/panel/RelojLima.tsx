"use client";

import { useEffect, useState } from "react";
import styles from "./panel.module.css";

const formatoFecha = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  weekday: "short",
  day: "numeric",
  month: "short",
});

const formatoHora = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Fecha y hora de Lima en el header del panel. Arranca vacío y se rellena
 * tras montar, como el reloj del login, para no desajustar la hidratación.
 */
export function RelojLima() {
  const [ahora, setAhora] = useState<Date | null>(null);

  useEffect(() => {
    const actualizar = () => setAhora(new Date());
    actualizar();
    const id = window.setInterval(actualizar, 15_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <time className={styles.reloj} suppressHydrationWarning>
      <span className={styles.relojFecha}>
        {ahora ? formatoFecha.format(ahora).replace(".", "") : "—"}
      </span>
      <span className={styles.relojHora}>
        {ahora ? formatoHora.format(ahora) : "--:--"}
      </span>
    </time>
  );
}
