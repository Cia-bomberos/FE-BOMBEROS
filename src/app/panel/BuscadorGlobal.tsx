"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { EstadoDocumento } from "@/lib/datos-demo";
import { EtiquetaEstado } from "./bandeja-documental/Etiquetas";
import { IconBuscar, IconFlecha } from "./iconos";
import styles from "./panel.module.css";

/** Lo mínimo de un documento para encontrarlo y mostrarlo en la paleta. */
export type EntradaBusqueda = {
  id: string;
  numero: string;
  tipo: string;
  asunto: string;
  origen: string;
  seccion: string;
  estado: EstadoDocumento;
};

const MAX_RESULTADOS = 8;

const sinSuscripcion = () => () => {};
const esMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Buscador global del header: abre una paleta (clic o ⌘K / Ctrl+K) que
 * filtra los documentos visibles para el usuario por número, asunto,
 * remitente, tipo o sección y salta al detalle con Enter.
 *
 * Los documentos llegan ya filtrados por permisos desde el layout, así que
 * nadie encuentra por aquí lo que no vería en la bandeja.
 */
export function BuscadorGlobal({ documentos }: { documentos: EntradaBusqueda[] }) {
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [activo, setActivo] = useState(0);
  // En el servidor no hay plataforma: se asume Ctrl y se corrige al hidratar.
  const mac = useSyncExternalStore(sinSuscripcion, esMac, () => false);
  const entrada = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const router = useRouter();

  const resultados = useMemo(() => {
    const tokens = normalizar(consulta).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    return documentos
      .map((documento) => {
        const pajar = normalizar(
          [
            documento.numero,
            documento.asunto,
            documento.origen,
            documento.tipo,
            documento.seccion,
            documento.estado,
          ].join(" "),
        );
        if (!tokens.every((token) => pajar.includes(token))) return null;
        // El número del documento pesa más que el resto de campos.
        const enNumero = tokens.some((token) =>
          normalizar(documento.numero).includes(token),
        );
        return { documento, peso: enNumero ? 0 : 1 };
      })
      .filter((r): r is { documento: EntradaBusqueda; peso: number } => r !== null)
      .sort((a, b) => a.peso - b.peso)
      .slice(0, MAX_RESULTADOS)
      .map((r) => r.documento);
  }, [consulta, documentos]);

  // ⌘K / Ctrl+K desde cualquier parte del panel.
  useEffect(() => {
    const alTeclear = (evento: KeyboardEvent) => {
      if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        setAbierto((estaba) => !estaba);
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);

  // Al abrir: foco al campo y bloqueo del scroll de fondo.
  useEffect(() => {
    if (!abierto) return;
    entrada.current?.focus();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [abierto]);

  // Mantiene visible la fila activa al navegar con teclado.
  useEffect(() => {
    lista.current
      ?.querySelector<HTMLElement>(`[data-indice="${activo}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activo]);

  const cerrar = () => {
    setAbierto(false);
    setConsulta("");
  };

  const irA = (id: string) => {
    cerrar();
    router.push(`/panel/bandeja-documental/documentos/${id}`);
  };

  const verTodos = () => {
    const q = consulta.trim();
    cerrar();
    router.push(
      `/panel/bandeja-documental/documentos${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    );
  };

  const alTeclearCampo = (evento: React.KeyboardEvent<HTMLInputElement>) => {
    switch (evento.key) {
      case "ArrowDown":
        evento.preventDefault();
        setActivo((i) => Math.min(resultados.length - 1, i + 1));
        break;
      case "ArrowUp":
        evento.preventDefault();
        setActivo((i) => Math.max(0, i - 1));
        break;
      case "Enter":
        evento.preventDefault();
        if (resultados[activo]) irA(resultados[activo].id);
        else if (consulta.trim()) verTodos();
        break;
      case "Escape":
        evento.preventDefault();
        cerrar();
        break;
    }
  };

  const hayConsulta = consulta.trim().length > 0;

  // La paleta se monta dentro de `[data-panel]` y no en `body`: las variables
  // del tema (colores, líneas) están declaradas ahí y fuera no existen.
  const contenedor =
    typeof document === "undefined"
      ? null
      : document.querySelector<HTMLElement>("[data-panel]") ?? document.body;

  return (
    <>
      <button
        type="button"
        className={styles.buscador}
        onClick={() => setAbierto(true)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
      >
        <IconBuscar width={15} height={15} />
        <span className={styles.buscadorTexto}>Buscar documento…</span>
        <kbd className={styles.buscadorAtajo} aria-hidden="true">
          {mac ? "⌘" : "Ctrl"} K
        </kbd>
      </button>

      {abierto &&
        contenedor &&
        createPortal(
          <div
            className={styles.paletaVelo}
            onPointerDown={(evento) => {
              if (evento.target === evento.currentTarget) cerrar();
            }}
          >
            <div
              className={styles.paleta}
              role="dialog"
              aria-modal="true"
              aria-label="Buscar documentos"
            >
              <div className={styles.paletaCampo}>
                <IconBuscar width={17} height={17} />
                <input
                  ref={entrada}
                  type="text"
                  className={styles.paletaEntrada}
                  value={consulta}
                  onChange={(evento) => {
                    setConsulta(evento.target.value);
                    setActivo(0);
                  }}
                  onKeyDown={alTeclearCampo}
                  placeholder="Número, asunto, remitente, tipo o sección…"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-controls="resultados-busqueda"
                  aria-activedescendant={
                    resultados[activo] ? `resultado-${resultados[activo].id}` : undefined
                  }
                />
                <kbd className={styles.buscadorAtajo} aria-hidden="true">
                  Esc
                </kbd>
              </div>

              {!hayConsulta && (
                <p className={styles.paletaPista}>
                  Escriba para buscar entre los {documentos.length} documentos de
                  su ámbito. Use ↑ ↓ para moverse y Enter para abrir.
                </p>
              )}

              {hayConsulta && resultados.length === 0 && (
                <p className={styles.paletaPista}>
                  Sin coincidencias para <strong>“{consulta.trim()}”</strong>.
                </p>
              )}

              {resultados.length > 0 && (
                <ul
                  className={styles.paletaLista}
                  id="resultados-busqueda"
                  ref={lista}
                  role="listbox"
                >
                  {resultados.map((documento, indice) => (
                    <li
                      key={documento.id}
                      id={`resultado-${documento.id}`}
                      className={styles.resultado}
                      role="option"
                      aria-selected={indice === activo}
                      data-indice={indice}
                      data-active={indice === activo}
                      onPointerMove={() => setActivo(indice)}
                      onClick={() => irA(documento.id)}
                    >
                      <span className={styles.resultadoNumero}>{documento.numero}</span>
                      <span className={styles.resultadoCuerpo}>
                        <span className={styles.resultadoAsunto}>{documento.asunto}</span>
                        <span className={styles.resultadoMeta}>
                          {documento.tipo} · {documento.origen} · {documento.seccion}
                        </span>
                      </span>
                      <EtiquetaEstado estado={documento.estado} />
                      <span className={styles.resultadoIr} aria-hidden="true">
                        <IconFlecha width={14} height={14} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {hayConsulta && (
                <button type="button" className={styles.paletaPie} onClick={verTodos}>
                  Ver todos los resultados en la bandeja
                  <IconFlecha width={13} height={13} />
                </button>
              )}
            </div>
          </div>,
          contenedor,
        )}
    </>
  );
}
