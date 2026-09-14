import type { Metadata } from "next";
import Link from "next/link";
import type { EstadoDocumento } from "@/lib/datos-demo";
import { listarDocumentos } from "@/lib/documentos-repo";
import { kpisDeSeccion, resolverPeriodo } from "@/lib/kpis";
import { seccionPorClave } from "@/lib/secciones";
import { exigirSeccion } from "../acceso";
import { EncabezadoSeccion } from "../Encabezado";
import { Kpis } from "../Kpis";
import styles from "../../panel.module.css";

export const metadata: Metadata = { title: "Administración" };

const ESTADOS: { estado: EstadoDocumento; clase: string }[] = [
  { estado: "Pendiente", clase: styles.estadoPendiente },
  { estado: "En proceso", clase: styles.estadoEnProceso },
  { estado: "Atendido", clase: styles.estadoAtendido },
  { estado: "Archivado", clase: styles.estadoArchivado },
];

type Props = { searchParams: Promise<{ periodo?: string }> };

export default async function Administracion({ searchParams }: Props) {
  await exigirSeccion("administracion");
  const periodo = resolverPeriodo((await searchParams).periodo);
  const valores = await kpisDeSeccion("administracion", periodo);
  const DOCUMENTOS = await listarDocumentos();
  const seccion = seccionPorClave("administracion")!;

  const porEstado = ESTADOS.map((e) => ({
    ...e,
    cantidad: DOCUMENTOS.filter((d) => d.estado === e.estado).length,
  }));
  const maximo = Math.max(...porEstado.map((e) => e.cantidad), 1);

  const vencidos = DOCUMENTOS.filter(
    (d) => d.estado === "Pendiente" || d.estado === "En proceso",
  ).slice(0, 6);

  return (
    <div className={`${styles.contenido} ${styles.moduloEjecutivo}`}>
      <EncabezadoSeccion seccion={seccion} periodo={periodo} />

      <Kpis valores={valores} tono={seccion.tono} />

      <section className={styles.rejilla}>
        <article className={`${styles.tarjeta} ${styles.tarjetaColumna}`}>
          <div className={styles.tarjetaEncabezado}>
            <h2 className={styles.tarjetaTitulo}>Documentos por estado</h2>
            <span className={styles.tarjetaNota}>
              {DOCUMENTOS.length} registrados · base de cálculo
            </span>
          </div>

          <div className={`${styles.barras} ${styles.barrasRepartidas}`}>
            {porEstado.map((fila, i) => (
              <div key={fila.estado} className={styles.barraFila}>
                <span className={fila.clase}>{fila.estado}</span>
                <span className={styles.barraValor}>{fila.cantidad}</span>
                <span className={styles.barraPista}>
                  <span
                    className={styles.barraRelleno}
                    style={{
                      width: `${(fila.cantidad / maximo) * 100}%`,
                      background:
                        "linear-gradient(90deg, currentColor, color-mix(in srgb, currentColor 35%, transparent))",
                      color: seccion.tono,
                      animationDelay: `${i * 90}ms`,
                    }}
                  />
                </span>
              </div>
            ))}
          </div>

          <p className={`${styles.tarjetaNota} ${styles.alFondo}`}>
            Un documento cuenta como atendido cuando está en estado Atendido o
            Archivado.
          </p>
        </article>

        <article className={`${styles.tarjeta} ${styles.tarjetaColumna}`}>
          <div className={styles.tarjetaEncabezado}>
            <h2 className={styles.tarjetaTitulo}>Procesos pendientes</h2>
            <Link
              className={styles.botonSecundario}
              href="/panel/bandeja-documental/documentos"
            >
              Ir a la bandeja
            </Link>
          </div>

          <div className={styles.progresoLista}>
            {vencidos.map((documento) => (
              <Link
                key={documento.id}
                href={`/panel/bandeja-documental/documentos/${documento.id}`}
                className={styles.progresoFila}
              >
                <span>
                  {documento.numero}
                  <span className={styles.celdaSecundaria}>
                    {documento.asunto}
                  </span>
                </span>
                <span
                  className={`${styles.etiqueta} ${
                    documento.estado === "Pendiente"
                      ? styles.estadoPendiente
                      : styles.estadoEnProceso
                  }`}
                >
                  {documento.estado}
                </span>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
