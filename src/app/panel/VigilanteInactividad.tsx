"use client";

import { useEffect, useRef, useState } from "react";
import { AVISO_PREVIO_MS, INACTIVIDAD_MAXIMA_MS } from "@/lib/inactividad";
import panel from "./panel.module.css";
import styles from "./inactividad.module.css";

/** Última actividad compartida entre pestañas del mismo navegador. */
const CLAVE_COMPARTIDA = "f3_ultima_actividad";

/**
 * Cada cuánto, como máximo, se avisa al servidor de que hay actividad. El
 * pulso final de cada ráfaga sale al cerrarse la ventana, así la cookie del
 * servidor nunca queda más de 30 s por detrás de lo que ve el navegador y
 * el middleware no corta antes que este vigilante.
 */
const PULSO_MS = 30_000;

/** Con esta frecuencia, como máximo, se registra la actividad. */
const REGISTRO_MS = 1_000;

const EVENTOS = [
  "pointerdown",
  "pointermove",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
] as const;

/**
 * Cierra la sesión tras 5 minutos sin actividad, avisando durante el último
 * minuto. Toda interacción (mover el mouse, teclear, desplazarse) reinicia
 * la cuenta; una vez vencida, ya no la revive.
 *
 * El respaldo del servidor está en `src/middleware.ts`.
 */
export function VigilanteInactividad() {
  const [restante, setRestante] = useState<number | null>(null);
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let ultima = Date.now();
    // La carga de la página pasó por el middleware: el servidor está al día.
    let ultimoPulso = ultima;
    let pulsoPendiente: number | undefined;
    let cerrando = false;

    guardarCompartida(ultima);

    const ultimaActividad = () => Math.max(ultima, leerCompartida());

    const cerrar = () => {
      if (cerrando) return;
      cerrando = true;
      formulario.current?.submit();
    };

    const pulso = async () => {
      pulsoPendiente = undefined;
      ultimoPulso = Date.now();
      try {
        const respuesta = await fetch("/panel/actividad", {
          method: "POST",
          cache: "no-store",
        });
        // El middleware redirige al login si la sesión ya no existe.
        if (respuesta.redirected && !cerrando) {
          cerrando = true;
          window.location.assign(respuesta.url);
        }
      } catch {
        // Sin red: el próximo pulso lo vuelve a intentar.
      }
    };

    const revisar = () => {
      if (cerrando) return;
      const falta = INACTIVIDAD_MAXIMA_MS - (Date.now() - ultimaActividad());
      if (falta <= 0) {
        cerrar();
        return;
      }
      setRestante(falta <= AVISO_PREVIO_MS ? Math.ceil(falta / 1000) : null);
    };

    const alActuar = () => {
      if (cerrando) return;
      const ahora = Date.now();

      // Volver tras el límite (equipo suspendido, pestaña dormida) no
      // reanima la sesión.
      if (ahora - ultimaActividad() >= INACTIVIDAD_MAXIMA_MS) {
        cerrar();
        return;
      }
      if (ahora - ultima < REGISTRO_MS) return;

      ultima = ahora;
      guardarCompartida(ahora);
      revisar();

      pulsoPendiente ??= window.setTimeout(
        pulso,
        Math.max(0, ultimoPulso + PULSO_MS - ahora),
      );
    };

    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "visible") revisar();
    };

    const reloj = window.setInterval(revisar, 1_000);
    for (const evento of EVENTOS) {
      window.addEventListener(evento, alActuar, { passive: true, capture: true });
    }
    document.addEventListener("visibilitychange", alCambiarVisibilidad);

    return () => {
      window.clearInterval(reloj);
      window.clearTimeout(pulsoPendiente);
      for (const evento of EVENTOS) {
        window.removeEventListener(evento, alActuar, { capture: true });
      }
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, []);

  return (
    <>
      <form
        ref={formulario}
        method="post"
        action="/panel/inactividad"
        hidden
      />

      {restante !== null && (
        <div className={styles.velo}>
          <div
            className={styles.aviso}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="inactividad-titulo"
            aria-describedby="inactividad-detalle"
          >
            <p className={styles.etiqueta}>Sesión inactiva</p>
            <h2 id="inactividad-titulo" className={styles.titulo}>
              Se cerrará en{" "}
              <span className={styles.cuenta}>{formatear(restante)}</span>
            </h2>
            <p id="inactividad-detalle" className={styles.detalle}>
              Por seguridad, su sesión se cerrará automáticamente si no
              registra actividad.
            </p>
            {/* Basta cualquier interacción para seguir; el botón la hace
                explícita. */}
            <button type="button" className={panel.botonPrimario} autoFocus>
              Seguir conectado
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function formatear(segundos: number) {
  const minutos = Math.floor(segundos / 60);
  return `${minutos}:${String(segundos % 60).padStart(2, "0")}`;
}

function leerCompartida() {
  try {
    return Number(localStorage.getItem(CLAVE_COMPARTIDA)) || 0;
  } catch {
    return 0;
  }
}

function guardarCompartida(momento: number) {
  try {
    localStorage.setItem(CLAVE_COMPARTIDA, String(momento));
  } catch {
    // Sin almacenamiento cada pestaña cuenta por su cuenta.
  }
}
