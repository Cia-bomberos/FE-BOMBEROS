"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./desplegable.module.css";

export type OpcionDesplegable = {
  valor: string;
  texto: string;
  /** Encabezado bajo el que se agrupa la opción (opcional). */
  grupo?: string;
};

type Props = {
  opciones: OpcionDesplegable[];
  /** Controlado: valor actual. Si se omite, el componente guarda el suyo. */
  valor?: string;
  valorInicial?: string;
  onCambio?: (valor: string) => void;
  /** Con `nombre`, un <input hidden> lleva el valor en el formulario. */
  nombre?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  /** `aria-invalid` para marcar error de validación. */
  invalido?: boolean;
  className?: string;
};

/**
 * Desplegable con el estilo del panel. Sustituye al <select> nativo, cuyo
 * menú lo dibuja el sistema operativo y no admite tema.
 *
 * Accesible: botón `combobox` + lista `listbox`; flechas, Inicio/Fin,
 * Enter/Espacio y Escape; clic fuera cierra. Con `nombre`, participa en el
 * formulario como un campo más.
 */
export function Desplegable({
  opciones,
  valor,
  valorInicial = "",
  onCambio,
  nombre,
  placeholder = "Seleccione…",
  disabled = false,
  id,
  invalido = false,
  className,
}: Props) {
  const controlado = valor !== undefined;
  const [interno, setInterno] = useState(valorInicial);
  const actual = controlado ? valor : interno;

  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);
  const raiz = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const idLista = useId();

  const seleccionada = opciones.find((o) => o.valor === actual);
  const grupos = [...new Set(opciones.map((o) => o.grupo))];

  const elegir = (nuevo: string) => {
    if (!controlado) setInterno(nuevo);
    onCambio?.(nuevo);
    setAbierto(false);
  };

  const abrir = () => {
    if (disabled) return;
    const indice = opciones.findIndex((o) => o.valor === actual);
    setActivo(indice === -1 ? 0 : indice);
    setAbierto(true);
  };

  // Clic fuera y Escape cierran la lista.
  useEffect(() => {
    if (!abierto) return;
    const alClic = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("pointerdown", alClic);
    return () => document.removeEventListener("pointerdown", alClic);
  }, [abierto]);

  // La opción activa se mantiene a la vista al navegar con el teclado.
  useEffect(() => {
    if (!abierto || activo < 0) return;
    lista.current
      ?.querySelector<HTMLElement>(`[data-indice="${activo}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [abierto, activo]);

  const alTeclear = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const ultimo = opciones.length - 1;

    if (!abierto) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActivo((i) => Math.min(ultimo, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActivo((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActivo(0);
        break;
      case "End":
        e.preventDefault();
        setActivo(ultimo);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (activo >= 0) elegir(opciones[activo].valor);
        break;
      case "Escape":
      case "Tab":
        setAbierto(false);
        break;
    }
  };

  let indice = -1;

  return (
    <div ref={raiz} className={`${styles.raiz} ${className ?? ""}`}>
      {nombre && <input type="hidden" name={nombre} value={actual} />}

      <button
        type="button"
        id={id}
        className={styles.boton}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-invalid={invalido || undefined}
        disabled={disabled}
        data-vacio={!seleccionada}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        onKeyDown={alTeclear}
      >
        <span className={styles.texto}>{seleccionada?.texto ?? placeholder}</span>
        <svg
          className={styles.flecha}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {abierto && (
        <ul
          ref={lista}
          id={idLista}
          className={styles.lista}
          role="listbox"
          aria-activedescendant={activo >= 0 ? `${idLista}-${activo}` : undefined}
        >
          {grupos.map((grupo) => (
            <li key={grupo ?? "_"} role="presentation" className={styles.grupo}>
              {grupo && <span className={styles.grupoTitulo}>{grupo}</span>}
              <ul role="group" aria-label={grupo} className={styles.grupoLista}>
                {opciones
                  .filter((o) => o.grupo === grupo)
                  .map((opcion) => {
                    indice += 1;
                    const i = indice;
                    const elegida = opcion.valor === actual;
                    return (
                      <li
                        key={opcion.valor}
                        id={`${idLista}-${i}`}
                        data-indice={i}
                        role="option"
                        aria-selected={elegida}
                        className={`${styles.opcion} ${i === activo ? styles.opcionActiva : ""}`}
                        onPointerEnter={() => setActivo(i)}
                        onClick={() => elegir(opcion.valor)}
                      >
                        <span className={styles.marca} aria-hidden="true">
                          {elegida && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m5 12.5 4.5 4.5L19 7.5" />
                            </svg>
                          )}
                        </span>
                        {opcion.texto}
                      </li>
                    );
                  })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
