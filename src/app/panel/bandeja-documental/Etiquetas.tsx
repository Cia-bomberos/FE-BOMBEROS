import type { Documento, EstadoDocumento } from "@/lib/datos-demo";
import styles from "../panel.module.css";

const CLASES_ESTADO: Record<EstadoDocumento, string> = {
  Pendiente: styles.estadoPendiente,
  "En proceso": styles.estadoEnProceso,
  Atendido: styles.estadoAtendido,
  Archivado: styles.estadoArchivado,
};

const CLASES_PRIORIDAD: Record<Documento["prioridad"], string> = {
  Alta: styles.prioridadAlta,
  Media: styles.prioridadMedia,
  Baja: styles.prioridadBaja,
};

export function EtiquetaEstado({ estado }: { estado: EstadoDocumento }) {
  return (
    <span className={`${styles.etiqueta} ${CLASES_ESTADO[estado]}`}>
      {estado}
    </span>
  );
}

export function EtiquetaPrioridad({
  prioridad,
}: {
  prioridad: Documento["prioridad"];
}) {
  return (
    <span className={`${styles.etiqueta} ${CLASES_PRIORIDAD[prioridad]}`}>
      {prioridad}
    </span>
  );
}
