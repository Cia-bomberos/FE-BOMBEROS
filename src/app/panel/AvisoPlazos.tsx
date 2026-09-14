import Link from "next/link";
import { HOY_DEMO, type Documento } from "@/lib/datos-demo";
import { DIAS_AVISO, parsearFecha, resumenPlazos } from "@/lib/plazos";
import { IconAlerta, IconFlecha } from "./iconos";
import styles from "./panel.module.css";

/**
 * Aviso de documentos vencidos o por vencer, en el header. Enlaza a la
 * bandeja con el filtro "Vencen pronto" ya aplicado. Solo se muestra a
 * quien puede actuar sobre toda la bandeja (Jefatura y Administración).
 *
 * TODO(integración): con datos reales, `hoy` es `new Date()`.
 */
export function AvisoPlazos({ documentos }: { documentos: Documento[] }) {
  const hoy = parsearFecha(HOY_DEMO) ?? new Date();
  const { vencidos, porVencer } = resumenPlazos(documentos, hoy);
  const total = vencidos.length + porVencer.length;

  if (total === 0) return null;

  const partes: string[] = [];
  if (vencidos.length) {
    partes.push(`${vencidos.length} vencido${vencidos.length === 1 ? "" : "s"}`);
  }
  if (porVencer.length) {
    partes.push(
      `${porVencer.length} vence${porVencer.length === 1 ? "" : "n"} en ${DIAS_AVISO} días`,
    );
  }

  return (
    <Link
      href="/panel/bandeja-documental/documentos?plazo=proximos"
      className={styles.aviso}
      data-urgente={vencidos.length > 0}
      title="Ver en la bandeja"
    >
      <span className={styles.avisoIcono}>
        <IconAlerta width={16} height={16} />
      </span>
      <span className={styles.avisoTexto}>
        <span>
          <strong>{total}</strong>{" "}
          {total === 1 ? "documento" : "documentos"} con plazo
        </span>
        <em>{partes.join(" · ")}</em>
      </span>
      <span className={styles.avisoAccion} aria-hidden="true">
        <IconFlecha width={14} height={14} />
      </span>
    </Link>
  );
}
