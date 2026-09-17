"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { solicitarAcceso } from "./actions";
import { estadoInicial } from "./estado";
import {
  IconAlert,
  IconCapsLock,
  IconCheck,
  IconShield,
} from "./icons";
import styles from "./login.module.css";

export function LoginForm() {
  const [estado, enviar, pendiente] = useActionState(
    solicitarAcceso,
    estadoInicial,
  );
  // React reinicia el formulario tras ejecutar la acción: el usuario se
  // mantiene controlado para no perderlo en un intento fallido (la
  // contraseña sí se limpia, a propósito).
  const [usuario, setUsuario] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [mayusculas, setMayusculas] = useState(false);
  const router = useRouter();

  // Tras conceder el acceso se deja ver la confirmación un instante y se
  // entra al panel.
  useEffect(() => {
    if (estado.estado !== "concedido") return;
    const id = window.setTimeout(() => router.push("/panel"), 1400);
    return () => window.clearTimeout(id);
  }, [estado, router]);

  const detectarMayusculas = (evento: React.KeyboardEvent<HTMLInputElement>) => {
    setMayusculas(evento.getModifierState?.("CapsLock") ?? false);
  };

  if (estado.estado === "concedido") {
    return (
      <div className={styles.granted}>
        <h2 className={styles.grantedTitle}>Espere un momento</h2>
        <p className={styles.grantedText}>
          Bienvenido,{estado.grado ? ` ${estado.grado}` : ""}{" "}
          <strong style={{ textTransform: "capitalize" }}>
            {estado.nombre}
          </strong>
          .<br />
        </p>
        <div className={styles.progress}>
          <i />
        </div>
      </div>
    );
  }

  const error = estado.estado === "error" ? estado : null;

  return (
    <>
      <div className={styles.cardHead}>

        <h3 className={styles.cardTitle}>
          Sistema de gestion institucional
        </h3>
      </div>

      <form className={styles.form} action={enviar} noValidate>
        <div className={styles.field} data-invalid={error?.campo === "usuario"}>
          <label className={styles.label} htmlFor="usuario">
            Nombre de usuario
          </label>
          <div className={styles.inputWrap}>
            <input
              id="usuario"
              name="usuario"
              type="text"
              className={styles.input}
              placeholder="Ingrese nombre de usuario"
              value={usuario}
              onChange={(evento) => setUsuario(evento.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              disabled={pendiente}
              aria-invalid={error?.campo === "usuario"}
            />
          </div>
        </div>

        <div className={styles.field} data-invalid={error?.campo === "clave"}>
          <label className={styles.label} htmlFor="clave">
            Contraseña
          </label>
          <div className={styles.inputWrap}>
            <input
              id="clave"
              name="clave"
              type={verClave ? "text" : "password"}
              className={styles.input}
              placeholder="••••••••••"
              autoComplete="current-password"
              disabled={pendiente}
              aria-invalid={error?.campo === "clave"}
              onKeyDown={detectarMayusculas}
              onKeyUp={detectarMayusculas}
              onBlur={() => setMayusculas(false)}
            />
            
          </div>
          {mayusculas && (
            <p className={styles.hint}>
              <IconCapsLock />
              Bloq Mayús activado
            </p>
          )}
        </div>

        <div className={styles.options}>
          <label className={styles.check}>
            <input type="checkbox" name="recordar" disabled={pendiente} />
            <span className={styles.box}>
              <IconCheck />
            </span>
            Mantener sesión en este equipo
          </label>
        </div>

        <div aria-live="polite">
          {error && (
            <p className={styles.alert} role="alert">
              <IconAlert width={15} height={15} />
              {error.mensaje}
            </p>
          )}
        </div>

        <button type="submit" className={styles.submit} disabled={pendiente}>
          <span className={styles.submitInner}>
            {pendiente ? (
              <>
                Verificando
                <span className={styles.dots} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </>
            ) : (
              <>
                Ingresar al sistema
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h13" />
                  <path d="m12.5 6 6 6-6 6" />
                </svg>
              </>
            )}
          </span>
        </button>
      </form>

      <p className={styles.notice}>
        <IconShield />
        <span>
          Sistema de uso exclusivo del personal autorizado de la Compañía.
        </span>
      </p>
    </>
  );
}
