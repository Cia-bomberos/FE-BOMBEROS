"use client";

import { useActionState, useId, useState } from "react";
import { Desplegable } from "@/components/ui/desplegable";
import { SelectorArchivo } from "@/components/ui/selector-archivo";
import { SelectorFecha } from "@/components/ui/selector-fecha";
import type { Documento } from "@/lib/tipos-documento";
import type { ClaveSeccion } from "@/lib/secciones";
import {
  adjuntar,
  ajustarPrioridad,
  cambiarEstadoAction,
  derivar,
  envioExterno,
} from "../../acciones";
import { useEnvioPdf } from "../../envio-pdf";
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
const ABIERTOS = new Set<Documento["estado"]>(["Pendiente", "En proceso"]);

/** Gestión cerrada: el backend ya no admite derivar ni envío externo. */
const CERRADOS = new Set<Documento["estado"]>(["Atendido", "Archivado"]);

/** Tope de las notas; el backend solo exige 500 al derivar. */
const MAX_NOTA = 250;

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

  const esExterno = documento.tipo === "Externo";

  const pestanasVisibles = esExterno ? PESTANAS.filter((p) => p.clave !== "derivar") : PESTANAS;

  const [pestana, setPestana] = useState<Pestana>(pestanasVisibles[0].clave);

  return (
    <section className={styles.tarjeta}>
      <div className={styles.tarjetaEncabezado}>
        <h2 className={styles.tarjetaTitulo}>Gestionar documento</h2>
      </div>

      <div className={styles.pestanas} role="tablist">
        {pestanasVisibles.map((p) => (
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

      {!esExterno && pestana === "derivar" && (<Derivar documento={documento} secciones={secciones} />)}
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

  if (CERRADOS.has(documento.estado)) {
    return (
      <p className={styles.campoAyuda}>
        El documento está {documento.estado}: su gestión está cerrada y ya no puede derivarse.
      </p>
    );
  }

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
        <Campo etiqueta={<>Nota<small>(Opcional)</small></>} nombre="nota" estado={estado} ancho>
          <NotaConContador disabled={pendiente} placeholder="Para atención según su competencia." />
        </Campo>
      </div>
      <Pie estado={estado} pendiente={pendiente} texto="Derivar" />
    </form>
  );
}

function CambiarEstado({ documento }: Readonly<{ documento: Documento }>) {
  const [estado, enviar, pendiente] = useActionState(cambiarEstadoAction, estadoInicial);

  // Si ya está Archivado, no se puede hacer nada
  if (documento.estado === "Archivado") {
    return (
      <p className={styles.campoAyuda}>
        El documento está Archivado y no admite más cambios de estado.
      </p>
    );
  }

  // Determinar las opciones disponibles según el estado actual
  const opciones = [];
  if (documento.estado === "Pendiente") {
    opciones.push(
      { valor: "En proceso", texto: "En proceso" },
      { valor: "Atendido", texto: "Atendido" },
    );
  } else if (documento.estado === "En proceso") {
    opciones.push({ valor: "Atendido", texto: "Atendido" });
  }
  if (documento.estado === "Atendido") {
    opciones.push({ valor: "Archivado", texto: "Archivado" });
  }

  return (
    <form className={styles.formulario} action={enviar} key={documento.trazabilidad.length}>
      <input type="hidden" name="id" value={documento.id} />
      <div className={styles.formularioRejilla}>
        <Campo etiqueta="Nuevo estado" nombre="estado" estado={estado}>
          <Desplegable
            nombre="estado"
            disabled={pendiente}
            invalido={estado.estado === "error" && estado.campo === "estado"}
            opciones={opciones}
          />
        </Campo>
        <Campo etiqueta={<>Nota<small>(Opcional)</small></>} nombre="nota" estado={estado} ancho>
          <NotaConContador disabled={pendiente} />
        </Campo>
      </div>
      <Pie estado={estado} pendiente={pendiente} texto="Guardar estado" />
    </form>
  );
}

function AjustarPrioridad({ documento }: Readonly<{ documento: Documento }>) {
  const [estado, enviar, pendiente] = useActionState(ajustarPrioridad, estadoInicial);

  if (documento.estado === "Archivado") {
    return (
      <p className={styles.campoAyuda}>
        El documento está Archivado y no admite más cambios de estado.
      </p>
    );
  }

  return (
    <form className={styles.formulario} action={enviar} key={documento.trazabilidad.length}>
      <input type="hidden" name="id" value={documento.id} />
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
          <SelectorFecha
            nombre="plazo"
            etiqueta="Nuevo plazo"
            sinPasado
            disabled={pendiente}
            invalido={estado.estado === "error" && estado.campo === "plazo"}
          />
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

  if (CERRADOS.has(documento.estado)) {
    return (
      <p className={styles.campoAyuda}>
        El documento está {documento.estado}: ya no admite envíos externos.
      </p>
    );
  }

  return (
    <form className={styles.formulario} action={enviar} key={documento.trazabilidad.length}>
      <input type="hidden" name="id" value={documento.id} />
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
  const [estadoAccion, enviar, pendiente] = useActionState(adjuntar, estadoInicial);
  const { estado, alEnviar, limpiarAviso } = useEnvioPdf(estadoAccion, enviar);

  // RN-0010: solo la sección responsable y solo mientras está En proceso.
  if (documento.estado !== "En proceso") {
    return (
      <p className={styles.campoAyuda}>
        El archivo solo puede reemplazarse mientras el documento está En proceso.
      </p>
    );
  }

  return (
    <form className={styles.formulario} action={enviar} onSubmit={alEnviar} key={documento.trazabilidad.length}>
      <input type="hidden" name="id" value={documento.id} />
      <div className={styles.formularioRejilla}>
        <Campo
          etiqueta={documento.adjunto ? "Reemplazar archivo" : "Adjuntar archivo"}
          nombre="archivo"
          estado={estado}
          ancho
          ayuda="Tamaño máximo del PDF: 20 MB"
        >
          <SelectorArchivo
            nombre="archivo"
            etiqueta={documento.adjunto ? "Reemplazar archivo" : "Adjuntar archivo"}
            aceptar="application/pdf,.pdf"
            disabled={pendiente}
            invalido={estado.estado === "error" && estado.campo === "archivo"}
            onCambio={limpiarAviso}
          />
        </Campo>
      </div>
      <Pie estado={estado} pendiente={pendiente} texto="Guardar adjunto" />
    </form>
  );
}

/* ---------- Piezas ---------- */

/**
 * Controlado a propósito: React vacía los campos no controlados al terminar una
 * Server Action, y la nota y el contador se perderían si el backend la rechaza.
 * Vive dentro del formulario, así que se reinicia con él al guardar.
 */
function NotaConContador({
  disabled,
  placeholder,
}: Readonly<{ disabled: boolean; placeholder?: string }>) {
  const [nota, setNota] = useState("");
  const idContador = useId();

  return (
    <>
      <textarea
        name="nota"
        className={styles.entrada}
        value={nota}
        maxLength={MAX_NOTA}
        disabled={disabled}
        placeholder={placeholder}
        aria-describedby={idContador}
        onChange={(e) => setNota(e.target.value)}
      />
      <span id={idContador} className={styles.notaContador} data-lleno={nota.length >= MAX_NOTA}>
        {nota.length}/{MAX_NOTA}
      </span>
    </>
  );
}

function Campo({
  etiqueta, nombre, estado, ancho, ayuda, children,
}: Readonly<{
  etiqueta: React.ReactNode; nombre: string; estado: EstadoAccion; ancho?: boolean; ayuda?: string; children: React.ReactNode;
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