"use client";

import { useActionState, useState } from "react";
import { Desplegable } from "@/components/ui/desplegable";
import type { Documento } from "@/lib/datos-demo";
import type { ClaveSeccion } from "@/lib/secciones";
import {
  adjuntar,
  cambiarEstadoDocumento,
  derivar,
  envioExterno,
} from "../../acciones";
import { estadoInicial, type EstadoAccion } from "../../estado";
import { IconAlerta, IconCheck } from "../../../iconos";
import styles from "../../../panel.module.css";

type Pestana = "derivar" | "estado" | "envio" | "adjunto";

const PESTANAS: { clave: Pestana; texto: string }[] = [
  { clave: "derivar", texto: "Derivar" },
  { clave: "estado", texto: "Cambiar estado" },
  { clave: "envio", texto: "Envío externo" },
  { clave: "adjunto", texto: "Adjunto" },
];

const ESTADOS: Documento["estado"][] = ["Pendiente", "En proceso", "Atendido", "Archivado"];

/**
 * Las cuatro especializaciones de "Modificar documento" del caso de uso.
 * Cada una es un formulario propio hacia su Server Action; todas registran
 * una entrada en el historial (RN-0006).
 */
export function AccionesDocumento({
  documento,
  secciones,
}: {
  documento: Documento;
  secciones: { clave: ClaveSeccion; nombre: string }[];
}) {
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
      {pestana === "envio" && <EnvioExterno documento={documento} />}
      {pestana === "adjunto" && <Adjuntar documento={documento} />}
    </section>
  );
}

/* ---------- Formularios ---------- */

function Derivar({ documento, secciones }: { documento: Documento; secciones: { clave: ClaveSeccion; nombre: string }[] }) {
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

function CambiarEstado({ documento }: { documento: Documento }) {
  const [estado, enviar, pendiente] = useActionState(cambiarEstadoDocumento, estadoInicial);

  return (
    <form className={styles.formulario} action={enviar} key={documento.trazabilidad.length}>
      <input type="hidden" name="id" value={documento.id} />
      <div className={styles.formularioRejilla}>
        <Campo etiqueta="Nuevo estado" nombre="estado" estado={estado}>
          <Desplegable
            nombre="estado"
            placeholder={`Actual: ${documento.estado}`}
            disabled={pendiente}
            invalido={estado.estado === "error" && estado.campo === "estado"}
            opciones={ESTADOS.filter((e) => e !== documento.estado).map((e) => ({ valor: e, texto: e }))}
          />
        </Campo>
        <Campo etiqueta="Nota" nombre="nota" estado={estado} ancho ayuda="Opcional. Motivo o resultado de la gestión.">
          <textarea name="nota" className={styles.entrada} disabled={pendiente} />
        </Campo>
      </div>
      <Pie estado={estado} pendiente={pendiente} texto="Actualizar estado" />
    </form>
  );
}

function EnvioExterno({ documento }: { documento: Documento }) {
  const [estado, enviar, pendiente] = useActionState(envioExterno, estadoInicial);

  if (documento.envioExterno) {
    const e = documento.envioExterno;
    return (
      <p className={styles.campoAyuda}>
        Envío externo ya registrado el {e.fecha} a las {e.hora}: a {e.destinatario} por {e.medio}.
      </p>
    );
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

function Adjuntar({ documento }: { documento: Documento }) {
  const [estado, enviar, pendiente] = useActionState(adjuntar, estadoInicial);

  return (
    <form className={styles.formulario} action={enviar} key={documento.trazabilidad.length}>
      <input type="hidden" name="id" value={documento.id} />
      <div className={styles.formularioRejilla}>
        <Campo
          etiqueta={documento.adjunto ? "Reemplazar archivo" : "Adjuntar archivo"}
          nombre="archivo"
          estado={estado}
          ancho
          ayuda="PDF o imagen. El archivo se sube a Google Drive al conectar el gateway."
        >
          <input name="archivo" type="file" accept=".pdf,image/*" className={styles.entrada} disabled={pendiente} />
        </Campo>
      </div>
      <Pie estado={estado} pendiente={pendiente} texto="Guardar adjunto" />
    </form>
  );
}

/* ---------- Piezas ---------- */

function Campo({
  etiqueta, nombre, estado, ancho, ayuda, children,
}: {
  etiqueta: string; nombre: string; estado: EstadoAccion; ancho?: boolean; ayuda?: string; children: React.ReactNode;
}) {
  const invalido = estado.estado === "error" && estado.campo === nombre;
  return (
    <div className={`${styles.campo} ${ancho ? styles.campoAncho : ""}`} data-invalido={invalido}>
      <span className={styles.campoEtiqueta}>{etiqueta}</span>
      {children}
      {ayuda && <span className={styles.campoAyuda}>{ayuda}</span>}
    </div>
  );
}

function Pie({ estado, pendiente, texto }: { estado: EstadoAccion; pendiente: boolean; texto: string }) {
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
          <p className={`${styles.mensaje} ${styles.mensajeOk}`} role="status">
            <IconCheck width={14} height={14} />
            {estado.mensaje}
          </p>
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
