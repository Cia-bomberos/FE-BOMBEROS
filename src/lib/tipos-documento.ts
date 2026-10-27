import type { ClaveSeccion } from "./secciones";

export type EstadoDocumento =
  | "Pendiente"
  | "En proceso"
  | "Atendido"
  | "Archivado";

export type TipoDocumento =
  | "Oficio"
  | "Nota Informativa"
  | "Informe"
  | "Memorando"
  | "Carta"
  | "Solicitud"
  | "Acta";

export type Prioridad = "Alta" | "Media" | "Baja";

export type Etapa = {
  etapa: string;
  fecha: string;
  hora: string;
  responsable: string;
  detalle: string;
  completada: boolean;
  seccion: ClaveSeccion | undefined;
};

export type Adjunto = {
  nombre: string;
  tamano: string;
  actualizado: string;
};

export type EnvioExterno = {
  fecha: string;
  hora: string;
  medio: string;
  destinatario: string;
};

export type Modalidad = "completo" | "simplificado";

export type Documento = {
  id: string;
  numero: string;
  tipo: TipoDocumento | "Externo";
  modalidad?: Modalidad;
  asunto: string;
  origen: string;
  destino: string;
  seccion: ClaveSeccion;
  fechaIngreso: string;
  plazo: string;
  estado: EstadoDocumento;
  prioridad: Prioridad;
  prioridadManual?: boolean;
  adjunto?: Adjunto;
  envioExterno?: EnvioExterno;
  trazabilidad: Etapa[];
  soloLectura?: boolean;
};

export type EstadoUnidad = "Operativa" | "En mantenimiento" | "Fuera de servicio";

export type Unidad = {
  id: string;
  denominacion: string;
  tipo: string;
  estado: EstadoUnidad;
  conductor: string;
  kilometraje: number;
  combustible: number;
  proximoMantenimiento: string;
};

export type EstadoActivo = "Operativo" | "En reparación" | "De baja";

export type ActivoServicioGeneral = {
  codigo: string;
  descripcion: string;
  categoria: "Mobiliario" | "Suministro" | "Equipo";
  cantidad: number;
  ubicacion: string;
  estado: EstadoActivo;
};

export type InsumoMedico = {
  codigo: string;
  descripcion: string;
  cantidad: number;
  minimo: number;
  vence: string;
  ubicacion: string;
  estado: "Disponible" | "Bajo stock" | "Vencido";
};

export type RegistroKpi = {
  kpi: string;
  periodo: string;
  valor: number;
  detalle?: string;
  registradoPor: string;
  fecha: string;
};