"use client";

import { useEffect, useId, useRef, useState } from "react";
import { hoyLima } from "@/lib/plazos";
import styles from "./selector-fecha.module.css";

type Props = {
  /** Un <input hidden> lleva el valor en el formulario. */
  nombre: string;
  /** Recibe el mismo valor que viaja en el formulario. */
  onCambio?: (valor: string) => void;
  disabled?: boolean;
  id?: string;
  /** Nombre accesible cuando el campo no tiene un <label> asociado. */
  etiqueta?: string;
  /** `aria-invalid` para marcar error de validación. */
  invalido?: boolean;
  /** Bloquea los días anteriores a hoy y avisa si se escribe uno. */
  sinPasado?: boolean;
};

const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

const FORMATO_MES = new Intl.DateTimeFormat("es-PE", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const FORMATO_DIA = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "long",
  timeZone: "UTC",
});

const dosCifras = (n: number) => String(n).padStart(2, "0");

const partesIso = (iso: string) => iso.split("-").map(Number);

const fechaUtc = (iso: string) => {
  const [a, m, d] = partesIso(iso);
  return new Date(Date.UTC(a, m - 1, d));
};

const aIso = (fecha: Date) =>
  `${fecha.getUTCFullYear()}-${dosCifras(fecha.getUTCMonth() + 1)}-${dosCifras(fecha.getUTCDate())}`;

const sumarDias = (iso: string, dias: number) => {
  const fecha = fechaUtc(iso);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return aIso(fecha);
};

/** Mueve de mes conservando el día, o el último del mes si no existe. */
const sumarMeses = (iso: string, meses: number) => {
  const [a, m, d] = partesIso(iso);
  const ultimoDia = new Date(Date.UTC(a, m - 1 + meses + 1, 0)).getUTCDate();
  return aIso(new Date(Date.UTC(a, m - 1 + meses, Math.min(d, ultimoDia))));
};

const isoATexto = (iso: string) => {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

/** "dd/mm/aaaa" → "aaaa-mm-dd"; `null` si está incompleta o no existe. */
function textoAIso(texto: string): string | null {
  const coincidencia = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!coincidencia) return null;

  const [, d, m, a] = coincidencia;
  const iso = `${a}-${m}-${d}`;
  // Date desborda las fechas imposibles (31/02 pasa a marzo): no vuelven igual.
  return aIso(fechaUtc(iso)) === iso ? iso : null;
}

/** Escribe las barras: "25112026" o "25/11/2026"; "5/" se entiende como "05". */
function conMascara(entrada: string): string {
  const digitos = entrada
    .replace(/(^|\/)(\d)(?=\/)/g, "$10$2")
    .replace(/\D/g, "")
    .slice(0, 8);
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4)]
    .filter(Boolean)
    .join("/");
}

/**
 * Selector de fecha con el estilo del panel. Sustituye al <input type="date">,
 * cuyo formato decide el navegador: aquí siempre es dd/mm/aaaa, y se puede
 * escribir o elegir en el calendario.
 *
 * En el formulario viaja "aaaa-mm-dd", igual que el campo nativo. Una fecha
 * incompleta o imposible viaja tal cual se escribió para que la Server Action
 * la rechace, en vez de confundirla con un campo opcional vacío.
 */
export function SelectorFecha({
  nombre,
  onCambio,
  disabled = false,
  id,
  etiqueta,
  invalido = false,
  sinPasado = false,
}: Readonly<Props>) {
  const [hoy] = useState(() => textoAIso(hoyLima()) ?? "");
  const [texto, setTexto] = useState("");
  const [enFoco, setEnFoco] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botonCalendario = useRef<HTMLButtonElement>(null);
  const idCalendario = useId();
  const idAviso = useId();

  const iso = textoAIso(texto);
  const valor = iso ?? texto;
  const malFormada = texto !== "" && iso === null && (texto.length === 10 || !enFoco);
  // Las fechas "aaaa-mm-dd" se ordenan igual como texto que como fecha.
  const pasada = sinPasado && iso !== null && iso < hoy;
  const conAviso = malFormada || pasada;

  const actualizar = (nuevo: string) => {
    setTexto(nuevo);
    onCambio?.(textoAIso(nuevo) ?? nuevo);
  };

  const cerrarYEnfocar = () => {
    setAbierto(false);
    botonCalendario.current?.focus();
  };

  // Clic fuera, foco fuera y Escape cierran el calendario.
  useEffect(() => {
    if (!abierto) return;
    const estaFuera = (e: Event) => !raiz.current?.contains(e.target as Node);
    const alSalir = (e: Event) => {
      if (estaFuera(e)) setAbierto(false);
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setAbierto(false);
      botonCalendario.current?.focus();
    };
    document.addEventListener("pointerdown", alSalir);
    document.addEventListener("focusin", alSalir);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("pointerdown", alSalir);
      document.removeEventListener("focusin", alSalir);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  return (
    <div ref={raiz} className={styles.raiz}>
      <input type="hidden" name={nombre} value={valor} />

      <div className={styles.control}>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/aaaa"
          maxLength={10}
          className={styles.entrada}
          value={texto}
          disabled={disabled}
          aria-label={etiqueta}
          aria-invalid={invalido || conAviso || undefined}
          aria-describedby={conAviso ? idAviso : undefined}
          onChange={(e) => actualizar(conMascara(e.target.value))}
          onFocus={() => setEnFoco(true)}
          onBlur={() => setEnFoco(false)}
        />
        <button
          ref={botonCalendario}
          type="button"
          className={styles.botonCalendario}
          aria-label="Abrir calendario"
          aria-haspopup="dialog"
          aria-expanded={abierto}
          aria-controls={idCalendario}
          disabled={disabled}
          onClick={() => setAbierto((estaba) => !estaba)}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3.5" y="5" width="17" height="15.5" rx="1" />
            <path d="M3.5 10h17M8 3v4M16 3v4" />
          </svg>
        </button>
      </div>

      {conAviso && (
        <span id={idAviso} className={styles.aviso} role="alert">
          {pasada
            ? "La fecha no puede ser anterior a hoy."
            : "Fecha no válida. Use el formato dd/mm/aaaa."}
        </span>
      )}

      {abierto && (
        <Calendario
          id={idCalendario}
          hoy={hoy}
          minimo={sinPasado ? hoy : null}
          seleccion={iso}
          onElegir={(elegida) => {
            actualizar(isoATexto(elegida));
            cerrarYEnfocar();
          }}
          onLimpiar={() => {
            actualizar("");
            cerrarYEnfocar();
          }}
        />
      )}
    </div>
  );
}

function Calendario({
  id,
  hoy,
  minimo,
  seleccion,
  onElegir,
  onLimpiar,
}: Readonly<{
  id: string;
  hoy: string;
  /** Primer día que se puede elegir; `null` si no hay límite. */
  minimo: string | null;
  seleccion: string | null;
  onElegir: (iso: string) => void;
  onLimpiar: () => void;
}>) {
  // El cursor nunca cae en un día bloqueado: no podría recibir el foco.
  const acotar = (iso: string) => (minimo !== null && iso < minimo ? minimo : iso);
  const [cursor, setCursor] = useState(() => acotar(seleccion ?? hoy));
  const tabla = useRef<HTMLTableElement>(null);
  const idTitulo = useId();
  // Solo el teclado mueve el foco por los días: con ‹ › se queda en el botón.
  const enfocarCursor = useRef(true);

  useEffect(() => {
    if (!enfocarCursor.current) return;
    enfocarCursor.current = false;
    tabla.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  }, [cursor]);

  const [anio, mes] = partesIso(cursor);
  const primero = new Date(Date.UTC(anio, mes - 1, 1));
  // Semana de lunes a domingo, siempre 6 filas para que la altura no salte.
  const inicio = sumarDias(aIso(primero), -((primero.getUTCDay() + 6) % 7));
  const semanas = Array.from({ length: 6 }, (_, semana) =>
    Array.from({ length: 7 }, (_, dia) => sumarDias(inicio, semana * 7 + dia)),
  );

  const alTeclearDia = (e: React.KeyboardEvent) => {
    const diaSemana = (fechaUtc(cursor).getUTCDay() + 6) % 7;
    const destinos: Record<string, string> = {
      ArrowLeft: sumarDias(cursor, -1),
      ArrowRight: sumarDias(cursor, 1),
      ArrowUp: sumarDias(cursor, -7),
      ArrowDown: sumarDias(cursor, 7),
      Home: sumarDias(cursor, -diaSemana),
      End: sumarDias(cursor, 6 - diaSemana),
      PageUp: sumarMeses(cursor, -1),
      PageDown: sumarMeses(cursor, 1),
    };
    const destino = destinos[e.key];
    if (!destino) return;
    e.preventDefault();
    const acotado = acotar(destino);
    if (acotado === cursor) return;
    enfocarCursor.current = true;
    setCursor(acotado);
  };

  // Los meses "aaaa-mm" también se ordenan como texto.
  const sinMesAnterior = minimo !== null && cursor.slice(0, 7) <= minimo.slice(0, 7);

  return (
    <div id={id} className={styles.calendario} role="dialog" aria-labelledby={idTitulo}>
      <div className={styles.cabecera}>
        <button
          type="button"
          className={styles.botonMes}
          aria-label="Mes anterior"
          // aria-disabled y no disabled: el botón conserva el foco al llegar al límite.
          aria-disabled={sinMesAnterior || undefined}
          onClick={() => {
            if (!sinMesAnterior) setCursor(acotar(sumarMeses(cursor, -1)));
          }}
        >
          ‹
        </button>
        <span id={idTitulo} className={styles.titulo} aria-live="polite">
          {FORMATO_MES.format(primero)}
        </span>
        <button
          type="button"
          className={styles.botonMes}
          aria-label="Mes siguiente"
          onClick={() => setCursor(sumarMeses(cursor, 1))}
        >
          ›
        </button>
      </div>

      <table ref={tabla} className={styles.tabla} role="grid" aria-labelledby={idTitulo}>
        <thead>
          <tr>
            {DIAS_SEMANA.map((dia) => (
              <th key={dia} scope="col" className={styles.diaSemana}>
                {dia}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanas.map((semana) => (
            <tr key={semana[0]}>
              {semana.map((dia) => (
                <td key={dia} role="gridcell" aria-selected={dia === seleccion}>
                  <button
                    type="button"
                    className={styles.dia}
                    disabled={minimo !== null && dia < minimo}
                    tabIndex={dia === cursor ? 0 : -1}
                    aria-label={FORMATO_DIA.format(fechaUtc(dia))}
                    aria-current={dia === hoy ? "date" : undefined}
                    data-fuera={partesIso(dia)[1] !== mes}
                    data-elegido={dia === seleccion}
                    onClick={() => onElegir(dia)}
                    onKeyDown={alTeclearDia}
                  >
                    {partesIso(dia)[2]}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.pie}>
        <button type="button" className={styles.botonPie} onClick={onLimpiar}>
          Limpiar
        </button>
        <button type="button" className={styles.botonPie} onClick={() => onElegir(hoy)}>
          Hoy
        </button>
      </div>
    </div>
  );
}
