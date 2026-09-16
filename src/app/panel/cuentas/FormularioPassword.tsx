"use client";

import { useActionState, useState } from "react";
import type { CuentaCompartida } from "@/lib/cuentas-api";
import { estadoInicial } from "../bandeja-documental/estado";
import { cambiarPassword } from "./acciones";
import { IconAlerta, IconCheck } from "../iconos";
import styles from "../panel.module.css";

/**
 * Una tarjeta por cuenta compartida: muestra su estado y, al desplegarse,
 * el formulario de nueva contraseña. Cada tarjeta tiene su propio estado de
 * acción, así que un error en una no afecta a las demás.
 */
export function FormularioPassword({ cuenta }: { cuenta: CuentaCompartida }) {
  const [estado, enviar, pendiente] = useActionState(cambiarPassword, estadoInicial);
  const [abierto, setAbierto] = useState(false);

  // El formulario se cierra solo cuando el cambio prosperó; ante un error se
  // queda abierto con el campo marcado para corregirlo. Se ajusta durante el
  // render (sin efecto) comparando con el último resultado visto.
  const [ultimoEstado, setUltimoEstado] = useState(estado);
  if (estado !== ultimoEstado) {
    setUltimoEstado(estado);
    if (estado.estado === "ok") setAbierto(false);
  }

  const invalido = (campo: string) =>
    estado.estado === "error" && estado.campo === `${campo}-${cuenta.username}`;

  const idNueva = `nueva-${cuenta.username}`;
  const idConfirmacion = `confirmacion-${cuenta.username}`;

  return (
    <section className={styles.tarjeta}>
      <div className={styles.tarjetaEncabezado}>
        <h2 className={styles.tarjetaTitulo}>{cuenta.nombre ?? cuenta.username}</h2>
        <span className={styles.tarjetaNota}>
          {cuenta.username} · {etiquetaEstado(cuenta.estado)}
        </span>
      </div>

      {estado.estado === "ok" && !abierto ? (
        <p className={`${styles.mensaje} ${styles.mensajeOk}`} role="status">
          <IconCheck width={14} height={14} />
          {estado.mensaje}
        </p>
      ) : null}

      {!abierto ? (
        <button
          type="button"
          className={styles.botonSecundario}
          onClick={() => setAbierto(true)}
          style={{ marginTop: estado.estado === "ok" ? "0.75rem" : 0 }}
        >
          Cambiar contraseña…
        </button>
      ) : (
        <form className={styles.formulario} action={enviar} noValidate>
          <input type="hidden" name="username" value={cuenta.username} />
          <input type="hidden" name="grupo" value={cuenta.grupo} />

          <div className={styles.formularioRejilla}>
            <div className={styles.campo} data-invalido={invalido("nueva")}>
              <label className={styles.campoEtiqueta} htmlFor={idNueva}>
                Nueva contraseña
              </label>
              <input
                id={idNueva}
                name="nueva"
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

            <div className={styles.campo} data-invalido={invalido("confirmacion")}>
              <label className={styles.campoEtiqueta} htmlFor={idConfirmacion}>
                Confirmar contraseña
              </label>
              <input
                id={idConfirmacion}
                name="confirmacion"
                type="password"
                className={styles.entrada}
                autoComplete="new-password"
                placeholder="••••••••••"
                disabled={pendiente}
              />
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
              {pendiente ? "Guardando…" : "Guardar contraseña"}
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
