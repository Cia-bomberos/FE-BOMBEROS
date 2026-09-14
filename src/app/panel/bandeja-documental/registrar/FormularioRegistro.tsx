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
  secciones: { clave: ClaveSeccion; nombre: string }[];
  /** "dd/mm/yyyy": referencia para la prioridad sugerida por plazo. */
  hoy: string;
}) {
  const [estado, enviar, pendiente] = useActionState(registrar, estadoInicial);
  const [plazo, setPlazo] = useState("");
  const [prioridad, setPrioridad] = useState("");

  // RN-0013: Alta < 10 días, Media 10–30, Baja > 30, salvo asignación manual.
  const sugerida = useMemo(() => {
    const referencia = parsearFecha(hoy);
    const [a, m, d] = plazo.split("-");
    if (!referencia || !a || !m || !d) return null;
    const dias = diasRestantes(`${d}/${m}/${a}`, referencia);
    if (dias === null) return null;
    return dias < 10 ? "Alta" : dias <= 30 ? "Media" : "Baja";
  }, [plazo, hoy]);

  const invalido = (campo: string) =>
    estado.estado === "error" && estado.campo === campo;

  return (
    <form className={styles.formulario} action={enviar} noValidate>
      <div className={styles.formularioRejilla}>
        <div className={styles.campo} data-invalido={invalido("tipo")}>
          <label className={styles.campoEtiqueta} htmlFor="tipo">Tipo documental</label>
          <Desplegable
            id="tipo"
            nombre="tipo"
            disabled={pendiente}
            invalido={invalido("tipo")}
            opciones={TIPOS.map((tipo) => ({ valor: tipo, texto: tipo }))}
          />
        </div>

        <div className={styles.campo} data-invalido={invalido("numero")}>
          <label className={styles.campoEtiqueta} htmlFor="numero">
            Número <small>sin el año</small>
          </label>
          <input id="numero" name="numero" className={styles.entrada} inputMode="numeric" placeholder="126" disabled={pendiente} />
        </div>

        <div className={styles.campo} data-invalido={invalido("via")}>
          <label className={styles.campoEtiqueta} htmlFor="via">Vía de ingreso</label>
          <Desplegable
            id="via"
            nombre="via"
            valorInicial="Digital"
            disabled={pendiente}
            opciones={[
              { valor: "Digital", texto: "Digital (correo, WhatsApp, otro)" },
              { valor: "Físico", texto: "Físico (mesa de partes)" },
            ]}
          />
        </div>

        <div className={`${styles.campo} ${styles.campoAncho}`} data-invalido={invalido("asunto")}>
          <label className={styles.campoEtiqueta} htmlFor="asunto">Asunto</label>
          <input id="asunto" name="asunto" className={styles.entrada} placeholder="Descripción breve del contenido" disabled={pendiente} />
        </div>

        <div className={styles.campo} data-invalido={invalido("origen")}>
          <label className={styles.campoEtiqueta} htmlFor="origen">Remitente</label>
          <input id="origen" name="origen" className={styles.entrada} placeholder="IV Comandancia Departamental Lima" disabled={pendiente} />
        </div>

        <div className={styles.campo} data-invalido={invalido("destino")}>
          <label className={styles.campoEtiqueta} htmlFor="destino">Dirigido a</label>
          <input id="destino" name="destino" className={styles.entrada} placeholder="Jefatura de Compañía" disabled={pendiente} />
        </div>

        <div className={styles.campo} data-invalido={invalido("seccion")}>
          <label className={styles.campoEtiqueta} htmlFor="seccion">Sección responsable</label>
          <Desplegable
            id="seccion"
            nombre="seccion"
            valorInicial={secciones.length === 1 ? secciones[0].clave : ""}
            disabled={pendiente || secciones.length === 1}
            invalido={invalido("seccion")}
            opciones={secciones.map((s) => ({ valor: s.clave, texto: s.nombre }))}
          />
        </div>

        <div className={styles.campo} data-invalido={invalido("folios")}>
          <label className={styles.campoEtiqueta} htmlFor="folios">Folios</label>
          <input id="folios" name="folios" type="number" min={1} className={styles.entrada} defaultValue={1} disabled={pendiente} />
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
            Archivo digital <small>opcional · PDF o imagen</small>
          </label>
          <input id="archivo" name="archivo" type="file" accept=".pdf,image/*" className={styles.entrada} disabled={pendiente} />
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
