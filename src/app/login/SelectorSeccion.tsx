"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ROLES } from "@/lib/roles";
import { IconCheck, IconChevron } from "./icons";
import styles from "./login.module.css";

type Props = {
  id: string;
  name: string;
  value: string;
  onChange: (usuario: string) => void;
  disabled?: boolean;
};

/**
 * Lista desplegable de cuentas por sección. Reemplaza al `<select>` nativo
 * (cuyo menú lo pinta el sistema operativo y no admite estilos) por un
 * listbox propio con la estética de la sala de guardia. Envía el valor por
 * un `<input type="hidden">` para que el formulario siga siendo el mismo.
 */
export function SelectorSeccion({
  id,
  name,
  value,
  onChange,
  disabled,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(() =>
    Math.max(0, ROLES.findIndex((rol) => rol.usuario === value)),
  );
  const raiz = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const idLista = useId();
  const elegido = ROLES.find((rol) => rol.usuario === value);

  // Cierra al hacer clic fuera del componente.
  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (evento: PointerEvent) => {
      if (!raiz.current?.contains(evento.target as Node)) setAbierto(false);
    };
    document.addEventListener("pointerdown", alPulsar);
    return () => document.removeEventListener("pointerdown", alPulsar);
  }, [abierto]);

  // Al abrir, el foco pasa a la lista para navegar con el teclado.
  useEffect(() => {
    if (abierto) lista.current?.focus();
  }, [abierto]);

  const abrir = () => {
    if (disabled) return;
    setActivo(Math.max(0, ROLES.findIndex((rol) => rol.usuario === value)));
    setAbierto(true);
  };

  const elegir = (indice: number) => {
    onChange(ROLES[indice].usuario);
    setAbierto(false);
    (raiz.current?.querySelector("button") as HTMLButtonElement | null)?.focus();
  };

  const alTeclearBoton = (evento: React.KeyboardEvent<HTMLButtonElement>) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(evento.key)) {
      evento.preventDefault();
      abrir();
    }
  };

  const alTeclearLista = (evento: React.KeyboardEvent<HTMLUListElement>) => {
    const ultimo = ROLES.length - 1;
    switch (evento.key) {
      case "ArrowDown":
        evento.preventDefault();
        setActivo((i) => Math.min(ultimo, i + 1));
        break;
      case "ArrowUp":
        evento.preventDefault();
        setActivo((i) => Math.max(0, i - 1));
        break;
      case "Home":
        evento.preventDefault();
        setActivo(0);
        break;
      case "End":
        evento.preventDefault();
        setActivo(ultimo);
        break;
      case "Enter":
      case " ":
        evento.preventDefault();
        elegir(activo);
        break;
      case "Escape":
      case "Tab":
        setAbierto(false);
        break;
    }
  };

  return (
    <div className={styles.selector} ref={raiz} data-open={abierto}>
      <input type="hidden" name={name} value={value} />

      <button
        type="button"
        id={id}
        className={`${styles.input} ${styles.selectorBoton}`}
        data-placeholder={!elegido}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        onKeyDown={alTeclearBoton}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={idLista}
      >
        {elegido ? (
          <>
            <span className={styles.selectorSeccion}>{elegido.seccion}</span>
            <span className={styles.selectorUsuario}>{elegido.usuario}</span>
          </>
        ) : (
          "Seleccione su sección…"
        )}
      </button>
      <span className={styles.chevron} aria-hidden="true">
        <IconChevron />
      </span>
      <span className={styles.underline} />

      {abierto && (
        <ul
          className={styles.menu}
          id={idLista}
          ref={lista}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={id}
          aria-activedescendant={`${idLista}-${activo}`}
          onKeyDown={alTeclearLista}
        >
          <li className={styles.menuCabecera} aria-hidden="true">
            Cuentas de sección
          </li>
          {ROLES.map((rol, indice) => {
            const seleccionado = rol.usuario === value;
            return (
              <li
                key={rol.usuario}
                id={`${idLista}-${indice}`}
                className={styles.opcion}
                role="option"
                aria-selected={seleccionado}
                data-active={indice === activo}
                onPointerMove={() => setActivo(indice)}
                onClick={() => elegir(indice)}
              >
                <span className={styles.opcionMarca} aria-hidden="true" />
                <span className={styles.opcionTexto}>
                  <span className={styles.opcionSeccion}>{rol.seccion}</span>
                  <span className={styles.opcionUsuario}>{rol.usuario}</span>
                </span>
                <span className={styles.opcionCheck} aria-hidden="true">
                  <IconCheck />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
