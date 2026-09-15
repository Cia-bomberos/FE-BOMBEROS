"use client";

import { useMemo, useState } from "react";
import type { Activo } from "@/lib/inventario-repo";
import type { ClaveSeccion } from "@/lib/secciones";
import { EtiquetaEstadoActivo } from "./Etiquetas";
import { IconBuscar } from "../iconos";
import styles from "../panel.module.css";

export function TablaInventario({
  activos,
  secciones,
}: {
  activos: Activo[];
  secciones: { clave: ClaveSeccion; nombre: string }[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [seccion, setSeccion] = useState<ClaveSeccion | "Todas">("Todas");

  const nombre = (clave: ClaveSeccion) =>
    secciones.find((s) => s.clave === clave)?.nombre ?? clave;

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return activos.filter((activo) => {
      const coincideSeccion = seccion === "Todas" || activo.seccion === seccion;
      const coincideTexto =
        !texto ||
        [activo.codigo, activo.descripcion, activo.categoria, activo.ubicacion]
          .join(" ")
          .toLowerCase()
          .includes(texto);
      return coincideSeccion && coincideTexto;
    });
  }, [activos, busqueda, seccion]);

  return (
    <>
      <div className={styles.filtros}>
        <label className={styles.campoBusqueda}>
          <IconBuscar width={15} height={15} />
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar por código, descripción o ubicación…"
            aria-label="Buscar en el inventario"
          />
        </label>

        {secciones.length > 1 &&
          (["Todas", ...secciones.map((s) => s.clave)] as const).map((opcion) => (
            <button
              key={opcion}
              type="button"
              className={`${styles.chip} ${seccion === opcion ? styles.chipActivo : ""}`}
              onClick={() => setSeccion(opcion)}
            >
              {opcion === "Todas" ? "Todas" : nombre(opcion)}
            </button>
          ))}
      </div>

      <div className={styles.tablaEnvoltura}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Identificador</th>
              <th>Descripción</th>
              <th>Categoría</th>
              <th>Sección</th>
              <th>Ubicación</th>
              <th>Cantidad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((activo) => (
              <tr key={activo.codigo}>
                <td>
                  <span className={styles.celdaNumero}>{activo.codigo}</span>
                </td>
                <td className={styles.celdaAsunto}>
                  {activo.descripcion}
                  {activo.observaciones && (
                    <span className={styles.celdaSecundaria}>{activo.observaciones}</span>
                  )}
                </td>
                <td>{activo.categoria}</td>
                <td>{nombre(activo.seccion)}</td>
                <td>{activo.ubicacion}</td>
                <td>{activo.cantidad}</td>
                <td>
                  <EtiquetaEstadoActivo estado={activo.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtrados.length === 0 && (
          <p className={styles.vacio}>
            No se encontraron activos con los filtros aplicados.
          </p>
        )}
      </div>
    </>
  );
}
