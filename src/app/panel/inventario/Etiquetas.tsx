import type { EstadoActivo } from "@/lib/inventario-repo";
import styles from "../panel.module.css";

// Reutiliza los tonos de la bandeja: verde operativo, ámbar en atención, apagado de baja.
const CLASES_ESTADO: Record<EstadoActivo, string> = {
  Operativo: styles.estadoAtendido,
  Disponible: styles.estadoAtendido,
  "En reparación": styles.estadoPendiente,
  "Bajo stock": styles.estadoPendiente,
  "De baja": styles.estadoArchivado,
  Vencido: styles.prioridadAlta,
};

export function EtiquetaEstadoActivo({ estado }: { estado: EstadoActivo }) {
  return (
    <span className={`${styles.etiqueta} ${CLASES_ESTADO[estado]}`}>{estado}</span>
  );
}
