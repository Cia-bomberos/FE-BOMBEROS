"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import type { Documento, EstadoDocumento } from "@/lib/tipos-documento";
import { DIAS_AVISO, parsearFecha, requiereAtencion } from "@/lib/plazos";
import { EtiquetaEstado, EtiquetaPrioridad } from "../Etiquetas";
import { IconBuscar } from "../../iconos";
import styles from "../../panel.module.css";

const ESTADOS: (EstadoDocumento | "Todos")[] = [
  "Todos",
  "Pendiente",
  "En proceso",
  "Atendido",
  "Archivado",
];

const DOCS_POR_PAGINA = 10;

export function TablaDocumentos({
  documentos,
  hoy,
  soloPlazoInicial = false,
  busquedaInicial = "",
  paginaInicial = 1,
}: {
  readonly documentos: Documento[];
  /** Fecha de referencia "dd/mm/yyyy" para los plazos. */
  readonly hoy: string;
  /** Arranca con el filtro "Vencen pronto" activo. */
  readonly soloPlazoInicial?: boolean;
  /** Texto con el que arranca el filtro (llega del buscador global). */
  readonly busquedaInicial?: string;

  readonly paginaInicial?: number;
}) {
  const [busqueda, setBusqueda] = useState(busquedaInicial);
  const [estado, setEstado] = useState<EstadoDocumento | "Todos">("Todos");
  const [soloPlazo, setSoloPlazo] = useState(soloPlazoInicial);
  const [soloLectura, setSoloLectura] = useState(false);
  
  // Estado para la paginación
  const [paginaActual, setPaginaActual] = useState(paginaInicial);

  useEffect(() => {
    setPaginaActual(1);
    // Opcional: Limpiar la URL sin recargar
    const url = new URL(window.location.href);
    if (url.searchParams.has("pagina")) {
      url.searchParams.delete("pagina");
      window.history.replaceState({}, "", url.toString());
    }
  }, [documentos]);

  // Solo mostramos el chip de "Solo lectura" si hay al menos un derivado en
  // la lista. Si no, sería un filtro inútil que confunde.
  const hayDerivados = useMemo(
    () => documentos.some((d) => d.soloLectura),
    [documentos],
  );

  // 1. Filtramos todos los documentos
  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const referencia = parsearFecha(hoy) ?? new Date();
    return documentos.filter((documento) => {
      const coincidePlazo = !soloPlazo || requiereAtencion(documento, referencia);
      const coincideEstado = estado === "Todos" || documento.estado === estado;
      const coincideLectura = !soloLectura || documento.soloLectura === true;
      const coincideTexto =
        !texto ||
        [documento.numero, documento.asunto, documento.origen, documento.destino]
          .join(" ")
          .toLowerCase()
          .includes(texto);
      return coincidePlazo && coincideEstado && coincideLectura && coincideTexto;
    });
  }, [documentos, busqueda, estado, soloPlazo, soloLectura, hoy]);

  // 2. Calculamos la paginación
  const totalPaginas = Math.ceil(filtrados.length / DOCS_POR_PAGINA) || 1;
  const indiceInicio = (paginaActual - 1) * DOCS_POR_PAGINA;
  const documentosPaginados = filtrados.slice(indiceInicio, indiceInicio + DOCS_POR_PAGINA);

  // 3. Reseteamos la página a 1 cuando el usuario cambia un filtro
  const handleFiltro = (accion: () => void) => {
    setPaginaActual(1);
    accion();
  };

  return (
    <>
      <div className={styles.filtros}>
        <label className={styles.campoBusqueda}>
          <IconBuscar width={15} height={15} />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => handleFiltro(() => setBusqueda(e.target.value))}
            placeholder="Buscar por número, asunto o área…"
            aria-label="Buscar documentos"
          />
        </label>

        {ESTADOS.map((opcion) => (
          <button
            key={opcion}
            type="button"
            className={`${styles.chip} ${
              estado === opcion ? styles.chipActivo : ""
            }`}
            onClick={() => handleFiltro(() => setEstado(opcion))}
          >
            {opcion}
          </button>
        ))}

        <button
          type="button"
          className={`${styles.chip} ${styles.chipPlazo} ${
            soloPlazo ? styles.chipActivo : ""
          }`}
          onClick={() => handleFiltro(() => setSoloPlazo((activo) => !activo))}
          aria-pressed={soloPlazo}
          title={`Abiertos que vencieron o vencen en ${DIAS_AVISO} días`}
        >
          Vencen pronto
        </button>

        {hayDerivados && (
          <button
            type="button"
            className={`${styles.chip} ${soloLectura ? styles.chipActivo : ""}`}
            onClick={() => handleFiltro(() => setSoloLectura((activo) => !activo))}
            aria-pressed={soloLectura}
            title="Documentos que derivó a otra sección y sigue en solo lectura"
          >
            Solo lectura
          </button>
        )}
      </div>

      <div className={styles.tablaEnvoltura}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Documento</th>
              <th>Asunto</th>
              <th>Remitente</th>
              <th>Área responsable</th>
              <th>Ingreso · plazo</th>
              <th>Prioridad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {documentosPaginados.map((documento) => (
              <tr key={documento.id}>
                <td>
                  <Link
                    className={styles.celdaNumero}
                    href={`/panel/bandeja-documental/documentos/${documento.id}`}
                  >
                    {documento.numero}
                  </Link>
                  {documento.soloLectura && (
                    <span className={styles.celdaSecundaria}>Solo lectura</span>
                  )}
                </td>
                <td className={styles.celdaAsunto}>{documento.asunto}</td>
                <td>{documento.origen}</td>
                <td>{documento.destino}</td>
                <td>
                  {documento.fechaIngreso}
                  <span className={styles.celdaSecundaria}>
                    vence {documento.plazo}
                  </span>
                </td>
                <td>
                  <EtiquetaPrioridad prioridad={documento.prioridad} />
                </td>
                <td>
                  <EtiquetaEstado estado={documento.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtrados.length === 0 && (
          <p className={styles.vacio}>
            No se encontraron documentos con los filtros aplicados.
          </p>
        )}
      </div>

      {/* Controles de Paginación */}
      {filtrados.length > DOCS_POR_PAGINA && (
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginTop: "1rem",
          fontSize: "0.9rem"
        }}>
          <span style={{ color: "#666" }}>
            Mostrando {indiceInicio + 1}–{Math.min(indiceInicio + DOCS_POR_PAGINA, filtrados.length)} de {filtrados.length} documentos
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className={styles.botonSecundario}
              style={{ padding: "0.4rem 0.8rem", opacity: paginaActual === 1 ? 0.5 : 1 }}
            >
              Anterior
            </button>
            <span style={{ padding: "0.4rem", display: "flex", alignItems: "center" }}>
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas}
              className={styles.botonSecundario}
              style={{ padding: "0.4rem 0.8rem", opacity: paginaActual === totalPaginas ? 0.5 : 1 }}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </>
  );
}