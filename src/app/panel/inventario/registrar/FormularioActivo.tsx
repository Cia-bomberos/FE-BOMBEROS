"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Desplegable } from "@/components/ui/desplegable";
import { CATEGORIAS_ACTIVO, ESTADOS_ACTIVO } from "@/lib/inventario-repo";
import type { ClaveSeccion } from "@/lib/secciones";
import { estadoInicial } from "../../bandeja-documental/estado";
import { registrar } from "../acciones";
import { IconAlerta, IconFlecha } from "../../iconos";
import styles from "../../panel.module.css";

export function FormularioActivo({
  secciones,
}: {
  secciones: { clave: ClaveSeccion; nombre: string }[];
}) {
  const [estado, enviar, pendiente] = useActionState(registrar, estadoInicial);

  const invalido = (campo: string) =>
    estado.estado === "error" && estado.campo === campo;

  return (
    <form className={styles.formulario} action={enviar} noValidate>
      <div className={styles.formularioRejilla}>
        <div className={`${styles.campo} ${styles.campoAncho}`} data-invalido={invalido("descripcion")}>
          <label className={styles.campoEtiqueta} htmlFor="descripcion">Descripción</label>
          <input id="descripcion" name="descripcion" className={styles.entrada} placeholder="Extintores PQS 6 kg" disabled={pendiente} />
        </div>

        <div className={styles.campo} data-invalido={invalido("categoria")}>
          <label className={styles.campoEtiqueta} htmlFor="categoria">Categoría</label>
          <Desplegable
            id="categoria"
            nombre="categoria"
            disabled={pendiente}
            invalido={invalido("categoria")}
            opciones={CATEGORIAS_ACTIVO.map((c) => ({ valor: c, texto: c }))}
          />
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
          <span className={styles.campoAyuda}>
            El identificador único se asigna automáticamente según la sección.
          </span>
        </div>

        <div className={styles.campo} data-invalido={invalido("cantidad")}>
          <label className={styles.campoEtiqueta} htmlFor="cantidad">Cantidad</label>
          <input id="cantidad" name="cantidad" type="number" min={1} className={styles.entrada} defaultValue={1} disabled={pendiente} />
        </div>

        <div className={styles.campo} data-invalido={invalido("ubicacion")}>
          <label className={styles.campoEtiqueta} htmlFor="ubicacion">Ubicación</label>
          <input id="ubicacion" name="ubicacion" className={styles.entrada} placeholder="Almacén, Tópico, Ambulancia A-3…" disabled={pendiente} />
        </div>

        <div className={styles.campo} data-invalido={invalido("estado")}>
          <label className={styles.campoEtiqueta} htmlFor="estado">Estado</label>
          <Desplegable
            id="estado"
            nombre="estado"
            valorInicial="Operativo"
            disabled={pendiente}
            invalido={invalido("estado")}
            opciones={ESTADOS_ACTIVO.map((e) => ({ valor: e, texto: e }))}
          />
        </div>

        <div className={`${styles.campo} ${styles.campoAncho}`} data-invalido={invalido("observaciones")}>
          <label className={styles.campoEtiqueta} htmlFor="observaciones">
            Datos adicionales <small>opcional</small>
          </label>
          <textarea id="observaciones" name="observaciones" className={styles.entrada} rows={3} placeholder="Marca, modelo, serie, fecha de vencimiento, proveedor…" disabled={pendiente} />
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
        <Link href="/panel/inventario" className={styles.botonSecundario}>
          Cancelar
        </Link>
        <button type="submit" className={styles.botonPrimario} disabled={pendiente}>
          {pendiente ? "Registrando…" : "Registrar activo"}
          <IconFlecha width={15} height={15} />
        </button>
      </div>
    </form>
  );
}
