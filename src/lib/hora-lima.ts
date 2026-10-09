"use client";

import { useEffect, useState } from "react";

const formato = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/**
 * Hora de la estación. Arranca en null y solo empieza a correr tras el
 * montaje: así el marcado del servidor y el del cliente coinciden y no
 * hay desajuste de hidratación por el segundo que cambió en medio.
 */
export function useHoraLima() {
  const [hora, setHora] = useState<string | null>(null);

  useEffect(() => {
    const actualizar = () => setHora(formato.format(new Date()));
    actualizar();
    const id = window.setInterval(actualizar, 1000);
    return () => window.clearInterval(id);
  }, []);

  return hora;
}
