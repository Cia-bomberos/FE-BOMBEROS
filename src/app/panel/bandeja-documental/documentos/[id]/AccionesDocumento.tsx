"use client";

import { useActionState, useState } from "react";
import { Desplegable } from "@/components/ui/desplegable";
import type { Documento } from "@/lib/datos-demo";
import type { ClaveSeccion } from "@/lib/secciones";
import {
  adjuntar,
  ajustarPrioridad,
  cambiarEstadoDocumento,
  derivar,
  envioExterno,
} from "../../acciones";
import { estadoInicial, type EstadoAccion } from "../../estado";
import { IconAlerta, IconCheck } from "../../../iconos";
import styles from "../../../panel.module.css";

type Pestana = "derivar" | "estado" | "prioridad" | "envio" | "adjunto";

const PESTANAS: { clave: Pestana; texto: string }[] = [
  { clave: "derivar", texto: "Derivar" },
  { clave: "estado", texto: "Cambiar estado" },
  { clave: "prioridad", texto: "Prioridad" },
  { clave: "envio", texto: "Envío externo" },
  { clave: "adjunto", texto: "Adjunto" },
];

/** Estados desde los que se puede marcar Atendido (RN-0008, RN-0011). */
const ABIERTOS: Documento["estado"][] = ["Pendiente", "En proceso"];

/**
 * Las cuatro especializaciones de "Modificar documento" del caso de uso.
 * Cada una es un formulario propio hacia su Server Action; todas registran
 * una entrada en el historial (RN-0006).
 */
export function AccionesDocumento({
  documento,
  secciones,
}: Readonly<{
  documento: Documento;
  secciones: { clave: ClaveSeccion; nombre: string }[];
}>) {
  const [pestana, setPestana] = useState<Pestana>("derivar");

  return (
    <section className={styles.tarjeta}>
      <div className={styles.tarjetaEncabezado}>
        <h2 className={styles.tarjetaTitulo}>Gestionar documento</h2>
        <span className={styles.tarjetaNota}>Cada acción queda en el historial</span>
      </div>

      <div className={styles.pestanas} role="tablist">
        {PESTANAS.map((p) => (
          <button
            key={p.clave}
            type="button"
            role="tab"
            aria-selected={pestana === p.clave}
            className={`${styles.pestana} ${pestana === p.clave ? styles.pestanaActiva : ""}`}
            onClick={() => setPestana(p.clave)}
          >
            {p.texto}
          </button>
        ))}
      </div>

      {pestana === "derivar" && <Derivar documento={documento} secciones={secciones} />}
      {pestana === "estado" && <CambiarEstado documento={documento} />}
      {pestana === "prioridad" && <AjustarPrioridad documento={documento} />}
      {pestana === "envio" && <EnvioExterno documento={documento} />}
      {pestana === "adjunto" && <Adjuntar documento={documento} />}
    </section>
  );
}

/* ---------- Formularios ---------- */

function Derivar({ documento, secciones }: Readonly<{ documento: Documento; secciones: { clave: ClaveSeccion; nombre: string }[] }>) {
  const [estado, enviar, pendiente] = useActionState(derivar, estadoInicial);
  const opciones = secciones.filter((s) => s.clave !== documento.seccion);

  return (
    <form className={styles.formulario} action={enviar} key={documento.trazabilidad.length}>
      <input type="hidden" name="id" value={documento.id} />
      <div className={styles.formularioRejilla}>
        <Campo etiqueta="Sección destino" nombre="seccion" estado={estado}>
          <Desplegable
            nombre="seccion"
            disabled={pendiente}
            invalido={estado.estado === "error" && estado.campo === "seccion"}
            opciones={opciones.map((s) => ({ valor: s.clave, texto: s.nombre }))}
          />
        </Campo>
        <Campo etiqueta="Nota" nombre="nota" estado={estado} ancho ayuda="Opcional. Indicación para la sección que recibe.">
          <textarea name="nota" className={styles.entrada} disabled={pendiente} placeholder="Para atención según su competencia." />
        </Campo>
      </div>
      <Pie estado={estado} pendiente={pendiente} texto="Derivar" />
    </form>
  );
}

function CambiarEstado({ documento }: Readonly<{ documento: Documento }>) {
  const [estado, enviar, pendiente] = useActionState(cambiarEstadoDocumento, estadoInicial);

  // "En proceso" llega al derivar; "Archivado", automático a los 3 días de
  // atendido (RN-0026). El único cambio manual es a Atendido.
  if (!ABIERTOS.includes(documento.estado)) {
    return (
      <p className={styles.campoAyuda}>
        Un documento {documento.estado} no admite cambios de estado manuales.
        {documento.estado === "Atendido" &&
          " El sistema lo archivará automáticamente a los 3 días de atendido."}
      </p>
    );
  }

  return (
    <form className={styles.formulario} action={enviar} key={documento.trazabilidad.length}>
      <input type="hidden" name="id" value={documento.id} />
      <p className={styles.campoAyuda}>
        Para pasarlo a En proceso, derívelo a la sección que lo revisará.
      </p>
      <div className={styles.formularioRejilla}>
        <Campo etiqueta="Nuevo estado" nombre="estado" estado={estado}>
          <Desplegable
            nombre="estado"
            valorInicial="Atendido"
            disabled={pendiente}
            invalido={estado.estado === "error" && estado.campo === "estado"}
            opciones={[{ valor: "Atendido", texto: "Atendido" }]}
          />
        </Campo>
        <Campo etiqueta="Nota" nombre="nota" estado={estado} ancho ayuda="Opcional. Motivo o resultado de la gestión.">
          <textarea name="nota" className={styles.entrada} disabled={pendiente} />
        </Campo>
      </div>
      <Pie estado={estado} pendiente={pendiente} texto="Marcar como atendido" />
    </form>
  );
}

function AjustarPrioridad({ documento }: Readonly<{ documento: Documento }>) {
  const [estado, enviar, pendiente] = useActionState(ajustarPrioridad, estadoInicial);

  return (
    <form className={styles.formulario} action={enviar} key={documento.trazabilidad.length}>
      <input type="hidden" name="id" value={documento.id} />
      <p className={styles.campoAyuda}>
        La prioridad manual se respeta hasta que falten menos de 10 días: desde
        ahí el sistema la sube a Alta (RN-0018).
      </p>
      <div className={styles.formularioRejilla}>
        <Campo etiqueta="Prioridad" nombre="prioridad" estado={estado}>
          <Desplegable
            nombre="prioridad"
            placeholder={`Actual: ${documento.prioridad}`}
            disabled={pendiente}
            invalido={estado.estado === "error" && estado.campo === "prioridad"}
            opciones={["Alta", "Media", "Baja"].map((p) => ({ valor: p, texto: p }))}
          />
        </Campo>
        <Campo etiqueta="Nuevo plazo" nombre="plazo" estado={estado} ayuda={`Actual: ${documento.plazo}`}>
          <input name="plazo" type="date" className={styles.entrada} disabled={pendiente} />
        </Campo>
      </div>
      <Pie estado={estado} pendiente={pendiente} texto="Guardar prioridad" />
    </form>
  );
}

function EnvioExterno({ documento }: Readonly<{ documento: Documento }>) {
  const [estado, enviar, pendiente] = useActionState(envioExterno, estadoInicial);

  if (documento.envioExterno) {
    const e = documento.envioExterno;
    const detalle = e.destinatario && e.medio ? `: a ${e.destinatario} por ${e.medio}` : "";
    return (
      <p className={styles.campoAyuda}>
        Envío externo ya registrado el {e.fecha} a las {e.hora}{detalle}.
      </p>
    );
  }

  if (documento.estado === "Archivado") {
    return <p className={styles.campoAyuda}>El documento está Archivado: ya no admite envíos.</p>;
  }

  return (
    <form className={styles.formulario} action={enviar} key={documento.trazabilidad.length}>
      <input type="hidden" name="id" value={documento.id} />
      <p className={styles.campoAyuda}>
        El sistema no envía fuera de la Compañía (RF-0007): descargue el documento,
        remítalo por el canal que corresponda y regístrelo aquí. La gestión se
        cierra como Atendido.
      </p>
      <div className={styles.formularioRejilla}>
        <Campo etiqueta="Medio" nombre="medio" estado={estado}>
          <Desplegable
            nombre="medio"
            valorInicial="Correo institucional"
            disabled={pendiente}
            opciones={["Correo institucional", "Mesa de partes", "Courier", "Entrega en mano"].map((m) => ({ valor: m, texto: m }))}
          />
        </Campo>
        <Campo etiqueta="Entidad destinataria" nombre="destinatario" estado={estado}>
          <input name="destinatario" className={styles.entrada} placeholder="CGBVP · IV Comandancia" disabled={pendiente} />
        </Campo>
      </div>
      <Pie estado={estado} pendiente={pendiente} texto="Registrar envío" />
    </form>
  );
}

function Adjuntar({ documento }: Readonly<{ documento: Documento }>) {
  const [estado, enviar, pendiente] = useActionState(adjuntar, estadoInicial);

  // RN-0010: solo la sección responsable y solo mientras está En proceso.
  if (documento.estado !== "En proceso") {
    return (
      <p className={styles.campoAyuda}>
        El archivo solo puede reemplazarse mientras el documento está En proceso.
      </p>
    );
  }

  return (
    <form className={styles.formulario} action={enviar} key={documento.trazabilidad.length}>
      <input type="hidden" name="id" value={documento.id} />
      <div className={styles.formularioRejilla}>
        <Campo
          etiqueta={documento.adjunto ? "Reemplazar archivo" : "Adjuntar archivo"}
          nombre="archivo"
          estado={estado}
          ancho
          ayuda="PDF de hasta 20 MB. Reemplaza al adjunto actual."
        >
          <input name="archivo" type="file" accept="application/pdf,.pdf" className={styles.entrada} disabled={pendiente} />
        </Campo>
      </div>
      <Pie estado={estado} pendiente={pendiente} texto="Guardar adjunto" />
    </form>
  );
}

/* ---------- Piezas ---------- */

function Campo({
  etiqueta, nombre, estado, ancho, ayuda, children,
}: Readonly<{
  etiqueta: string; nombre: string; estado: EstadoAccion; ancho?: boolean; ayuda?: string; children: React.ReactNode;
}>) {
  const invalido = estado.estado === "error" && estado.campo === nombre;
  return (
    <div className={`${styles.campo} ${ancho ? styles.campoAncho : ""}`} data-invalido={invalido}>
      <span className={styles.campoEtiqueta}>{etiqueta}</span>
      {children}
      {ayuda && <span className={styles.campoAyuda}>{ayuda}</span>}
    </div>
  );
}

function Pie({ estado, pendiente, texto }: Readonly<{ estado: EstadoAccion; pendiente: boolean; texto: string }>) {
  return (
    <>
      <div aria-live="polite">
        {estado.estado === "error" && (
          <p className={`${styles.mensaje} ${styles.mensajeError}`} role="alert">
            <IconAlerta width={14} height={14} />
            {estado.mensaje}
          </p>
        )}
        {estado.estado === "ok" && (
          <output className={`${styles.mensaje} ${styles.mensajeOk}`}>
            <IconCheck width={14} height={14} />
            {estado.mensaje}
          </output>
        )}
      </div>
      <div className={styles.formularioPie}>
        <button type="submit" className={styles.botonPrimario} disabled={pendiente}>
          {pendiente ? "Guardando…" : texto}
        </button>
      </div>
    </>
  );
}
