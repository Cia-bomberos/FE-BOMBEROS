"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Desplegable } from "@/components/ui/desplegable";
import type { ClaveSeccion } from "@/lib/secciones";
import { diasRestantes, parsearFecha } from "@/lib/plazos";
import { registrar } from "../acciones";
import { estadoInicial } from "../estado";
import { IconAlerta, IconFlecha } from "../../iconos";
import styles from "../../panel.module.css";

const TIPOS = ["Oficio", "Nota Informativa", "Informe", "Memorando", "Carta", "Solicitud", "Acta"];

export function FormularioRegistro({
  secciones,
  hoy,
}: {
  readonly secciones: readonly { clave: ClaveSeccion; nombre: string }[];
  /** "dd/mm/yyyy": referencia para la prioridad sugerida por plazo. */
  readonly hoy: string;
}) {
  const [estado, enviar, pendiente] = useActionState(registrar, estadoInicial);
  const [plazo, setPlazo] = useState("");
  const [prioridad, setPrioridad] = useState("");
  // RN-0024: el externo usa el registro simplificado, sin tipo ni código.
  const [procedencia, setProcedencia] = useState("interno");
  const externo = procedencia === "externo";

  // RN-0013: Alta < 10 días, Media 10–30, Baja > 30, salvo asignación manual.
  const sugerida = useMemo(() => {
    const referencia = parsearFecha(hoy);
    const [a, m, d] = plazo.split("-");
    if (!referencia || !a || !m || !d) return null;

    const dias = diasRestantes(`${d}/${m}/${a}`, referencia);
    if (dias === null) return null;

    let prioridadSugerida = "Baja";
    if (dias < 10) {
      prioridadSugerida = "Alta";
    } else if (dias <= 30) {
      prioridadSugerida = "Media";
    }

    return prioridadSugerida;
  }, [plazo, hoy]);

  const invalido = (campo: string) =>
    estado.estado === "error" && estado.campo === campo;

  return (
    <form className={styles.formulario} action={enviar} noValidate>
      <div className={styles.formularioRejilla}>
        <div className={styles.campo} data-invalido={invalido("procedencia")}>
          <label className={styles.campoEtiqueta} htmlFor="procedencia">Procedencia</label>
          <Desplegable
            id="procedencia"
            nombre="procedencia"
            valor={procedencia}
            onCambio={setProcedencia}
            disabled={pendiente}
            invalido={invalido("procedencia")}
            opciones={[
              { valor: "interno", texto: "Interno · de la Compañía" },
              { valor: "externo", texto: "Externo · otra entidad" },
            ]}
          />
          <span className={styles.campoAyuda}>
            {externo
              ? "Registro simplificado: sin tipo ni código único."
              : "Registro completo: el código único lo asigna el sistema."}
          </span>
        </div>

        <div className={styles.campo} data-invalido={invalido("tipo")}>
          <label className={styles.campoEtiqueta} htmlFor="tipo">Tipo documental</label>
          <Desplegable
            id="tipo"
            nombre="tipo"
            disabled={pendiente || externo}
            invalido={invalido("tipo")}
            placeholder={externo ? "No aplica a externos" : undefined}
            opciones={TIPOS.map((tipo) => ({ valor: tipo, texto: tipo }))}
          />
        </div>

        <div className={styles.campo} data-invalido={invalido("via")}>
          <label className={styles.campoEtiqueta} htmlFor="via">Vía de ingreso</label>
          <Desplegable
            id="via"
            nombre="via"
            valorInicial="Digital"
            disabled={pendiente}
            opciones={[
              { valor: "Digital", texto: "Digital" },
              { valor: "Físico", texto: "Físico" },
            ]}
          />
        </div>

        <div className={`${styles.campo} ${styles.campoAncho}`} data-invalido={invalido("asunto")}>
          <label className={styles.campoEtiqueta} htmlFor="asunto">Asunto</label>
          <input id="asunto" name="asunto" className={styles.entrada} placeholder="Descripción breve del contenido" disabled={pendiente} />
        </div>

        <div className={styles.campo}>
          <label className={styles.campoEtiqueta} htmlFor="seccion">Sección responsable</label>
          <input
            id="seccion"
            className={styles.entrada}
            value={secciones.map((s) => s.nombre).join(", ")}
            readOnly
            disabled
          />
          <span className={styles.campoAyuda}>Queda registrado en la sección de su cuenta.</span>
        </div>

        <div className={styles.campo} data-invalido={invalido("plazo")}>
          <label className={styles.campoEtiqueta} htmlFor="plazo">Plazo de atención</label>
          <input id="plazo" name="plazo" type="date" className={styles.entrada} value={plazo} onChange={(e) => setPlazo(e.target.value)} disabled={pendiente} />
        </div>

        <div className={styles.campo} data-invalido={invalido("prioridad")}>
          <label className={styles.campoEtiqueta} htmlFor="prioridad">
            Prioridad <small>opcional</small>
          </label>
          <Desplegable
            id="prioridad"
            nombre="prioridad"
            valor={prioridad}
            onCambio={setPrioridad}
            disabled={pendiente}
            opciones={[
              { valor: "", texto: sugerida ? `Automática por plazo (${sugerida})` : "Automática por plazo" },
              { valor: "Alta", texto: "Alta" },
              { valor: "Media", texto: "Media" },
              { valor: "Baja", texto: "Baja" },
            ]}
          />
          <span className={styles.campoAyuda}>
            Alta si vence en menos de 10 días, Media hasta 30, Baja después.
          </span>
        </div>

        <div className={`${styles.campo} ${styles.campoAncho}`} data-invalido={invalido("archivo")}>
          <label className={styles.campoEtiqueta} htmlFor="archivo">
            Archivo digital <small>PDF · máximo 20 MB</small>
          </label>
          <input id="archivo" name="archivo" type="file" accept="application/pdf,.pdf" required className={styles.entrada} disabled={pendiente} />
        </div>
      </div>

      <div aria-live="polite">
        {estado.estado === "error" && (
          <p className={`${styles.mensaje} ${styles.mensajeError}`} role="alert">
            <IconAlerta width={14} height={14} />
            {estado.mensaje}
          </p>
        )}
      </div>

      <div className={styles.formularioPie}>
        <Link href="/panel/bandeja-documental/documentos" className={styles.botonSecundario}>
          Cancelar
        </Link>
        <button type="submit" className={styles.botonPrimario} disabled={pendiente}>
          {pendiente ? "Registrando…" : "Registrar documento"}
          <IconFlecha width={15} height={15} />
        </button>
      </div>
    </form>
  );
}
