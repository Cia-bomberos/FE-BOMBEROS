"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { solicitarAcceso } from "./actions";
import { estadoInicial } from "./estado";
import {
  IconAlert,
  IconCapsLock,
  IconCheckLarge,
  IconEye,
  IconEyeOff,
  IconLock,
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
        <div className={styles.grantedMark}>
          <IconCheckLarge />
        </div>
        <h2 className={styles.grantedTitle}>Acceso concedido</h2>
        <p className={styles.grantedText}>
          Bienvenido,{estado.grado ? ` ${estado.grado}` : ""}{" "}
          <strong style={{ textTransform: "capitalize" }}>
            {estado.nombre}
          </strong>
          .<br />
          Preparando su panel institucional…
        </p>
        <div className={styles.progress}>
          <i />
        </div>
      </div>
    );
  }

  // Primer ingreso: Cognito exige reemplazar la contraseña temporal antes de
  // emitir los tokens. Hasta que se complete, no hay sesión.
  if (estado.estado === "nueva-clave") {
    return (
      <>
        <div className={styles.cardHead}>
          <span className={styles.clearance}>
            <IconLock width={12} height={12} />
            Primer ingreso
          </span>
          <h1 className={styles.cardTitle}>
            Establezca su
            <br />
            contraseña
          </h1>
          <p className={styles.cardSub}>
            Su contraseña temporal solo sirve para este primer acceso. Defina
            ahora la definitiva para activar su cuenta.
          </p>
        </div>

        <form className={styles.form} action={enviar} noValidate>
          <input type="hidden" name="paso" value="nueva-clave" />

          <div className={styles.field} data-invalid={estado.campo === "nueva"}>
            <label className={styles.label} htmlFor="nueva">
              Nueva contraseña
            </label>
            <div className={styles.inputWrap}>
              <input
                id="nueva"
                name="nueva"
                type={verClave ? "text" : "password"}
                className={styles.input}
                placeholder="••••••••••"
                autoComplete="new-password"
                autoFocus
                disabled={pendiente}
                aria-invalid={estado.campo === "nueva"}
                aria-describedby="politica-clave"
                onKeyDown={detectarMayusculas}
                onKeyUp={detectarMayusculas}
                onBlur={() => setMayusculas(false)}
              />
              <button
                type="button"
                className={styles.reveal}
                onClick={() => setVerClave((visible) => !visible)}
                aria-pressed={verClave}
                aria-label={
                  verClave ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {verClave ? <IconEyeOff /> : <IconEye />}
              </button>
              <span className={styles.underline} />
            </div>
            <p className={styles.politica} id="politica-clave">
              Mínimo 8 caracteres, con mayúsculas, minúsculas, números y un
              símbolo.
            </p>
          </div>

          <div
            className={styles.field}
            data-invalid={estado.campo === "confirmacion"}
          >
            <label className={styles.label} htmlFor="confirmacion">
              Repita la contraseña
            </label>
            <div className={styles.inputWrap}>
              <input
                id="confirmacion"
                name="confirmacion"
                type={verClave ? "text" : "password"}
                className={styles.input}
                placeholder="••••••••••"
                autoComplete="new-password"
                disabled={pendiente}
                aria-invalid={estado.campo === "confirmacion"}
                onKeyDown={detectarMayusculas}
                onKeyUp={detectarMayusculas}
                onBlur={() => setMayusculas(false)}
              />
              <span className={styles.underline} />
            </div>
            {mayusculas && (
              <p className={styles.hint}>
                <IconCapsLock />
                Bloq Mayús activado
              </p>
            )}
          </div>

          <div aria-live="polite">
            {estado.mensaje && (
              <p className={styles.alert} role="alert">
                <IconAlert width={15} height={15} />
                {estado.mensaje}
              </p>
            )}
          </div>

          <button type="submit" className={styles.submit} disabled={pendiente}>
            <span className={styles.submitInner}>
              {pendiente ? (
                <>
                  Guardando
                  <span className={styles.dots} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                </>
              ) : (
                <>
                  Activar cuenta e ingresar
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
            Su contraseña es personal e intransferible. La Jefatura nunca se la
            solicitará por teléfono, correo ni mensajería.
          </span>
        </p>
      </>
    );
  }

  const error = estado.estado === "error" ? estado : null;

  return (
    <>
      <div className={styles.cardHead}>
        <span className={styles.clearance}>
          <IconLock width={12} height={12} />
          Acceso restringido
        </span>
        <h1 className={styles.cardTitle}>
          Sistema de gestión
          <br />
          institucional
        </h1>
        <p className={styles.cardSub}>
          Bandeja Documental y tablero operativo de la Compañía.
        </p>
      </div>

      <form className={styles.form} action={enviar} noValidate>
        <div className={styles.field} data-invalid={error?.campo === "usuario"}>
          <label className={styles.label} htmlFor="usuario">
            Usuario
          </label>
          <div className={styles.inputWrap}>
            <input
              id="usuario"
              name="usuario"
              type="text"
              className={styles.input}
              placeholder="jefatura"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={usuario}
              onChange={(evento) => setUsuario(evento.target.value)}
              disabled={pendiente}
              aria-invalid={error?.campo === "usuario"}
            />
            <span className={styles.underline} />
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
            <button
              type="button"
              className={styles.reveal}
              onClick={() => setVerClave((visible) => !visible)}
              aria-pressed={verClave}
              aria-label={
                verClave ? "Ocultar contraseña" : "Mostrar contraseña"
              }
            >
              {verClave ? <IconEyeOff /> : <IconEye />}
            </button>
            <span className={styles.underline} />
          </div>
          {mayusculas && (
            <p className={styles.hint}>
              <IconCapsLock />
              Bloq Mayús activado
            </p>
          )}
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
          Sistema de uso exclusivo del personal autorizado de la Compañía. Todo
          intento de acceso queda registrado con fecha, hora y dirección de red.
        </span>
      </p>
    </>
  );
}
