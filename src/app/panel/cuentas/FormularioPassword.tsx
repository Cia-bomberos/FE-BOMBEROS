"use client";

import { useActionState, useState, useEffect } from "react";
import type { CuentaCompartida } from "@/lib/cuentas-api";
import { estadoInicial } from "../bandeja-documental/estado";
import { cambiarUsername } from "./acciones";
import { IconAlerta, IconCheck } from "../iconos";
import styles from "../panel.module.css";

export function FormularioCuenta({ cuenta }: { readonly cuenta: CuentaCompartida }) {
  const [abierto, setAbierto] = useState(false);

  // Usamos la acción de cambiar username, ya que maneja ambos campos
  const [estado, enviar, pendiente] = useActionState(cambiarUsername, estadoInicial);

  useEffect(() => {
    if (estado.estado === "ok") {
      setAbierto(false);
    }
  }, [estado]);

  const invalido = (campo: string) =>
    estado.estado === "error" && estado.campo === `${campo}-${cuenta.username}`;

  return (
    <section className={styles.tarjeta}>
      <div className={styles.tarjetaEncabezado}>
        <h2 className={styles.tarjetaTitulo}>{cuenta.nombre ?? cuenta.username}</h2>
        <span className={styles.tarjetaNota}>
          {cuenta.username} · {etiquetaEstado(cuenta.estado)}
        </span>
      </div>

      {/* Mensaje de éxito cuando el formulario está cerrado */}
      {estado.estado === "ok" && !abierto && (
        <output className={`${styles.mensaje} ${styles.mensajeOk}`} aria-live="polite" style={{ marginTop: "0.75rem" }}>
          <IconCheck width={14} height={14} />
          {estado.mensaje}
        </output>
      )}

      {!abierto ? (
        <button
          type="button"
          className={styles.botonSecundario}
          onClick={() => setAbierto(true)}
          style={{ marginTop: estado.estado === "ok" ? "0.75rem" : 0 }}
        >
          Editar cuenta…
        </button>
      ) : (
        <form className={styles.formulario} action={enviar} noValidate>
          <input type="hidden" name="username" value={cuenta.username} />
          <input type="hidden" name="grupo" value={cuenta.grupo} />

          <div className={styles.formularioRejilla}>
            <div className={styles.campo} data-invalido={invalido("nuevo_username")}>
              <label className={styles.campoEtiqueta} htmlFor={`nuevo_username-${cuenta.username}`}>
                Nuevo nombre de usuario (opcional)
              </label>
              <input
                id={`nuevo_username-${cuenta.username}`}
                name="nuevo_username"
                type="text"
                className={styles.entrada}
                placeholder={`Actual: ${cuenta.username}`}
                disabled={pendiente}
              />
            </div>

            <div className={styles.campo} data-invalido={invalido("nueva_password")}>
              <label className={styles.campoEtiqueta} htmlFor={`nueva_password-${cuenta.username}`}>
                Nueva contraseña
              </label>
              <input
                id={`nueva_password-${cuenta.username}`}
                name="nueva_password"
                type="password"
                className={styles.entrada}
                autoComplete="new-password"
                placeholder="••••••••••"
                disabled={pendiente}
              />
              <span className={styles.campoAyuda}>
                Mínimo 8 caracteres, con mayúscula, minúscula y número.
              </span>
            </div>
          </div>

          <div className={styles.formularioPie}>
            <button
              type="button"
              className={styles.botonSecundario}
              onClick={() => setAbierto(false)}
              disabled={pendiente}
            >
              Cancelar
            </button>
            <button type="submit" className={styles.botonPrimario} disabled={pendiente}>
              {pendiente ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      )}

      <div aria-live="polite">
        {estado.estado === "error" && (
          <p className={`${styles.mensaje} ${styles.mensajeError}`} role="alert" style={{ marginTop: "0.75rem" }}>
            <IconAlerta width={14} height={14} />
            {estado.mensaje}
          </p>
        )}
      </div>
    </section>
  );
}

function etiquetaEstado(estado: string): string {
  switch (estado) {
    case "CONFIRMED":
      return "activa";
    case "FORCE_CHANGE_PASSWORD":
      return "contraseña temporal pendiente";
    case "DESCONOCIDO":
      return "estado no disponible";
    default:
      return estado.toLowerCase().replace(/_/g, " ");
  }
}