/**
 * Datos de demostración de las vistas del panel. Todo el contenido de este
 * archivo es ficticio y existe solo para poder mostrar la interfaz; al
 * conectar los sistemas reales debe reemplazarse por consultas al backend.
 *
 * La autenticación y el perfil del usuario ya NO salen de aquí: se resuelven
 * contra el API Gateway (`src/lib/auth.ts` y `src/lib/sesion.ts`).
 */

/* ============================================================
   Proyecto 1 — Bandeja Documental
   ============================================================ */

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

export type Etapa = {
  etapa: string;
  fecha: string;
  hora: string;
  responsable: string;
  detalle: string;
  completada: boolean;
};

export type Documento = {
  id: string;
  numero: string;
  tipo: TipoDocumento;
  asunto: string;
  origen: string;
  destino: string;
  via: "Físico" | "Digital";
  folios: number;
  fechaIngreso: string;
  plazo: string;
  estado: EstadoDocumento;
  prioridad: "Alta" | "Media" | "Baja";
  trazabilidad: Etapa[];
};

const traza = (
  responsableIngreso: string,
  seccion: string,
  fecha: string,
  hasta: number,
): Etapa[] => {
  const etapas = [
    {
      etapa: "Ingreso",
      hora: "08:42",
      responsable: responsableIngreso,
      detalle: "Documento registrado en la Bandeja Documental.",
    },
    {
      etapa: "Clasificación",
      hora: "08:44",
      responsable: "Administración",
      detalle: "Tipo, prioridad y área responsable asignados al registro.",
    },
    {
      etapa: "Seguimiento",
      hora: "11:30",
      responsable: seccion,
      detalle: "En revisión por el área responsable.",
    },
    {
      etapa: "Archivo",
      hora: "16:05",
      responsable: "Administración",
      detalle: "Documento archivado digitalmente.",
    },
  ];

  return etapas.map((e, i) => ({
    ...e,
    fecha,
    completada: i < hasta,
  }));
};

export const DOCUMENTOS: Documento[] = [
  {
    id: "125-2026",
    numero: "Oficio N° 125-2026",
    tipo: "Oficio",
    asunto: "Requerimiento de equipos de protección personal para el II semestre",
    origen: "IV Comandancia Departamental Lima",
    destino: "Sección Logística",
    via: "Digital",
    folios: 4,
    fechaIngreso: "04/08/2026",
    plazo: "12/08/2026",
    estado: "Pendiente",
    prioridad: "Alta",
    trazabilidad: traza("Bomb. Quispe Alarcón", "Sección Logística", "04/08/2026", 3),
  },
  {
    id: "089-2026",
    numero: "Nota Informativa N° 089-2026",
    tipo: "Nota Informativa",
    asunto: "Reporte de asistencia del personal correspondiente a julio 2026",
    origen: "Sección Personal",
    destino: "Jefatura de Compañía",
    via: "Digital",
    folios: 2,
    fechaIngreso: "04/08/2026",
    plazo: "08/08/2026",
    estado: "Atendido",
    prioridad: "Media",
    trazabilidad: traza("Bomb. Rojas Medina", "Jefatura de Compañía", "04/08/2026", 3),
  },
  {
    id: "021-2026",
    numero: "Informe N° 021-2026",
    tipo: "Informe",
    asunto: "Estado operativo de las unidades tras mantenimiento preventivo",
    origen: "Sección Máquinas",
    destino: "Jefatura de Compañía",
    via: "Digital",
    folios: 7,
    fechaIngreso: "03/08/2026",
    plazo: "10/08/2026",
    estado: "Pendiente",
    prioridad: "Alta",
    trazabilidad: traza("Bomb. Chávez Núñez", "Jefatura de Compañía", "03/08/2026", 2),
  },
  {
    id: "015-2026",
    numero: "Carta N° 015-2026",
    tipo: "Carta",
    asunto: "Agradecimiento por donación de equipamiento de rescate",
    origen: "Municipalidad de Cercado de Lima",
    destino: "Jefatura de Compañía",
    via: "Físico",
    folios: 1,
    fechaIngreso: "02/08/2026",
    plazo: "09/08/2026",
    estado: "Atendido",
    prioridad: "Baja",
    trazabilidad: traza("Bomb. Salazar Pinto", "Jefatura de Compañía", "02/08/2026", 5),
  },
  {
    id: "112-2026",
    numero: "Memorando N° 112-2026",
    tipo: "Memorando",
    asunto: "Cronograma de guardias del mes de agosto 2026",
    origen: "Jefatura de Compañía",
    destino: "Todo el personal",
    via: "Digital",
    folios: 3,
    fechaIngreso: "01/08/2026",
    plazo: "05/08/2026",
    estado: "Atendido",
    prioridad: "Media",
    trazabilidad: traza("Bomb. Rojas Medina", "Secciones", "01/08/2026", 5),
  },
  {
    id: "133-2026",
    numero: "Oficio N° 133-2026",
    tipo: "Oficio",
    asunto: "Convocatoria a capacitación en materiales peligrosos (HAZMAT)",
    origen: "Escuela CGBVP",
    destino: "Sección Instrucción",
    via: "Digital",
    folios: 5,
    fechaIngreso: "05/08/2026",
    plazo: "15/08/2026",
    estado: "En proceso",
    prioridad: "Media",
    trazabilidad: traza("Bomb. Quispe Alarcón", "Sección Instrucción", "05/08/2026", 4),
  },
  {
    id: "047-2026",
    numero: "Solicitud N° 047-2026",
    tipo: "Solicitud",
    asunto: "Solicitud de licencia por estudios — Bomb. Paredes Loayza",
    origen: "Sección Personal",
    destino: "Jefatura de Compañía",
    via: "Físico",
    folios: 2,
    fechaIngreso: "05/08/2026",
    plazo: "13/08/2026",
    estado: "Pendiente",
    prioridad: "Media",
    trazabilidad: traza("Bomb. Salazar Pinto", "Jefatura de Compañía", "05/08/2026", 2),
  },
  {
    id: "008-2026",
    numero: "Acta N° 008-2026",
    tipo: "Acta",
    asunto: "Acta de reunión del Cuadro de Oficiales — 05 de agosto",
    origen: "Secretaría de Compañía",
    destino: "Cuadro de Oficiales",
    via: "Digital",
    folios: 6,
    fechaIngreso: "05/08/2026",
    plazo: "12/08/2026",
    estado: "En proceso",
    prioridad: "Alta",
    trazabilidad: traza("Bomb. Chávez Núñez", "Cuadro de Oficiales", "05/08/2026", 4),
  },
  {
    id: "119-2026",
    numero: "Oficio N° 119-2026",
    tipo: "Oficio",
    asunto: "Coordinación de simulacro multisectorial en Cercado de Lima",
    origen: "INDECI",
    destino: "Sección Operaciones",
    via: "Digital",
    folios: 9,
    fechaIngreso: "31/07/2026",
    plazo: "07/08/2026",
    estado: "Atendido",
    prioridad: "Alta",
    trazabilidad: traza("Bomb. Rojas Medina", "Sección Operaciones", "31/07/2026", 3),
  },
  {
    id: "072-2026",
    numero: "Nota Informativa N° 072-2026",
    tipo: "Nota Informativa",
    asunto: "Consumo de combustible de unidades — julio 2026",
    origen: "Sección Máquinas",
    destino: "Administración",
    via: "Digital",
    folios: 2,
    fechaIngreso: "30/07/2026",
    plazo: "06/08/2026",
    estado: "Archivado",
    prioridad: "Baja",
    trazabilidad: traza("Bomb. Quispe Alarcón", "Administración", "30/07/2026", 5),
  },
  {
    id: "018-2026",
    numero: "Informe N° 018-2026",
    tipo: "Informe",
    asunto: "Evaluación de files de personal — avance del plan de actualización",
    origen: "Administración",
    destino: "Jefatura de Compañía",
    via: "Digital",
    folios: 11,
    fechaIngreso: "29/07/2026",
    plazo: "05/08/2026",
    estado: "Atendido",
    prioridad: "Alta",
    trazabilidad: traza("Bomb. Salazar Pinto", "Jefatura de Compañía", "29/07/2026", 5),
  },
  {
    id: "104-2026",
    numero: "Memorando N° 104-2026",
    tipo: "Memorando",
    asunto: "Disposición sobre uso de uniformes en actos institucionales",
    origen: "Jefatura de Compañía",
    destino: "Todo el personal",
    via: "Digital",
    folios: 1,
    fechaIngreso: "28/07/2026",
    plazo: "02/08/2026",
    estado: "Archivado",
    prioridad: "Baja",
    trazabilidad: traza("Bomb. Chávez Núñez", "Secciones", "28/07/2026", 5),
  },
];

export const KPIS_MESA = [
  { clave: "ingresos", etiqueta: "Ingresos", valor: 128, nota: "Este mes", variacion: 12 },
  { clave: "pendientes", etiqueta: "Pendientes", valor: 27, nota: "Por atender", variacion: -5 },
  { clave: "atendidos", etiqueta: "Atendidos", valor: 101, nota: "Este mes", variacion: 15 },
] as const;

export const SERIE_MENSUAL = [
  { mes: "Ene", valor: 24 },
  { mes: "Feb", valor: 31 },
  { mes: "Mar", valor: 52 },
  { mes: "Abr", valor: 44 },
  { mes: "May", valor: 68 },
  { mes: "Jun", valor: 49 },
  { mes: "Jul", valor: 74 },
  { mes: "Ago", valor: 88 },
];

export const DISTRIBUCION_TIPOS = [
  { tipo: "Oficios", valor: 38 },
  { tipo: "Notas informativas", valor: 24 },
  { tipo: "Informes", valor: 18 },
  { tipo: "Memorandos", valor: 12 },
  { tipo: "Otros", valor: 8 },
];

export const documentoPorId = (id: string) =>
  DOCUMENTOS.find((documento) => documento.id === id);

/* ============================================================
   Proyecto 2 — Dashboard Ejecutivo
   ------------------------------------------------------------
   Según el diseño (RN-0036 / RN-0037), los indicadores se calculan a
   partir de lo registrado en la plataforma: el inventario de cada
   sección y la gestión documental. Estos datos simulan ese registro;
   el cálculo de los KPIs vive en `src/lib/kpis.ts`.
   ============================================================ */

/* ---------- Máquinas: inventario de unidades vehiculares ---------- */

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

export const UNIDADES: Unidad[] = [
  { id: "B-3", denominacion: "Autobomba B-3", tipo: "Autobomba", estado: "Operativa", conductor: "Bomb. Quispe Alarcón", kilometraje: 84210, combustible: 82, proximoMantenimiento: "22/08/2026" },
  { id: "B-13", denominacion: "Autobomba B-13", tipo: "Autobomba", estado: "Operativa", conductor: "Bomb. Rojas Medina", kilometraje: 61840, combustible: 74, proximoMantenimiento: "05/09/2026" },
  { id: "B-23", denominacion: "Autobomba B-23", tipo: "Autobomba", estado: "En mantenimiento", conductor: "—", kilometraje: 118530, combustible: 35, proximoMantenimiento: "En taller" },
  { id: "R-3", denominacion: "Unidad de rescate R-3", tipo: "Rescate", estado: "Operativa", conductor: "Bomb. Chávez Núñez", kilometraje: 47320, combustible: 91, proximoMantenimiento: "18/09/2026" },
  { id: "R-13", denominacion: "Unidad de rescate R-13", tipo: "Rescate", estado: "Operativa", conductor: "Bomb. Salazar Pinto", kilometraje: 52990, combustible: 66, proximoMantenimiento: "29/08/2026" },
  { id: "A-3", denominacion: "Ambulancia A-3", tipo: "Ambulancia", estado: "Operativa", conductor: "Bomb. Paredes Loayza", kilometraje: 39150, combustible: 88, proximoMantenimiento: "12/09/2026" },
  { id: "A-13", denominacion: "Ambulancia A-13", tipo: "Ambulancia", estado: "Fuera de servicio", conductor: "—", kilometraje: 142870, combustible: 12, proximoMantenimiento: "Evaluación técnica" },
  { id: "E-3", denominacion: "Escala telescópica E-3", tipo: "Escala", estado: "Operativa", conductor: "Bomb. Villar Cáceres", kilometraje: 29640, combustible: 79, proximoMantenimiento: "02/09/2026" },
  { id: "C-3", denominacion: "Cisterna C-3", tipo: "Cisterna", estado: "Operativa", conductor: "Bomb. Huamán Ríos", kilometraje: 73410, combustible: 58, proximoMantenimiento: "25/08/2026" },
  { id: "U-3", denominacion: "Unidad de comando U-3", tipo: "Comando", estado: "Operativa", conductor: "Bomb. Ferrer Ayala", kilometraje: 21080, combustible: 95, proximoMantenimiento: "30/09/2026" },
  { id: "F-3", denominacion: "Forestal F-3", tipo: "Forestal", estado: "En mantenimiento", conductor: "—", kilometraje: 66720, combustible: 41, proximoMantenimiento: "En taller" },
];

/* ---------- Servicio General: mobiliario y suministros ---------- */

export type EstadoActivo = "Operativo" | "En reparación" | "De baja";

export type ActivoServicioGeneral = {
  codigo: string;
  descripcion: string;
  categoria: "Mobiliario" | "Suministro" | "Equipo";
  cantidad: number;
  ubicacion: string;
  estado: EstadoActivo;
};

export const INVENTARIO_SERVICIO_GENERAL: ActivoServicioGeneral[] = [
  { codigo: "SG-001", descripcion: "Escritorios de oficina", categoria: "Mobiliario", cantidad: 8, ubicacion: "Administración", estado: "Operativo" },
  { codigo: "SG-002", descripcion: "Sillas ergonómicas", categoria: "Mobiliario", cantidad: 14, ubicacion: "Administración", estado: "Operativo" },
  { codigo: "SG-003", descripcion: "Literas del cuartel", categoria: "Mobiliario", cantidad: 24, ubicacion: "Dormitorios", estado: "Operativo" },
  { codigo: "SG-004", descripcion: "Extintores PQS 6 kg", categoria: "Equipo", cantidad: 12, ubicacion: "Sede", estado: "En reparación" },
  { codigo: "SG-005", descripcion: "Grupo electrógeno 15 kW", categoria: "Equipo", cantidad: 1, ubicacion: "Patio de máquinas", estado: "Operativo" },
  { codigo: "SG-006", descripcion: "Cocina industrial", categoria: "Equipo", cantidad: 1, ubicacion: "Comedor", estado: "En reparación" },
  { codigo: "SG-007", descripcion: "Útiles de limpieza (kit mensual)", categoria: "Suministro", cantidad: 6, ubicacion: "Almacén", estado: "Operativo" },
  { codigo: "SG-008", descripcion: "Toners y papel bond", categoria: "Suministro", cantidad: 10, ubicacion: "Administración", estado: "Operativo" },
  { codigo: "SG-009", descripcion: "Proyector de sala de instrucción", categoria: "Equipo", cantidad: 1, ubicacion: "Sala de instrucción", estado: "De baja" },
  { codigo: "SG-010", descripcion: "Casilleros metálicos", categoria: "Mobiliario", cantidad: 30, ubicacion: "Vestidores", estado: "Operativo" },
];

/* ---------- Sanidad: insumos médicos ---------- */

export type InsumoMedico = {
  codigo: string;
  descripcion: string;
  cantidad: number;
  minimo: number;
  vence: string;
  ubicacion: string;
  estado: "Disponible" | "Bajo stock" | "Vencido";
};

export const INVENTARIO_SANIDAD: InsumoMedico[] = [
  { codigo: "SN-001", descripcion: "Guantes de nitrilo (caja x100)", cantidad: 18, minimo: 10, vence: "03/2028", ubicacion: "Ambulancia A-3", estado: "Disponible" },
  { codigo: "SN-002", descripcion: "Vendas elásticas 10 cm", cantidad: 40, minimo: 30, vence: "12/2027", ubicacion: "Tópico", estado: "Disponible" },
  { codigo: "SN-003", descripcion: "Suero fisiológico 1 L", cantidad: 6, minimo: 12, vence: "09/2026", ubicacion: "Ambulancia A-3", estado: "Bajo stock" },
  { codigo: "SN-004", descripcion: "Collarines cervicales (juego)", cantidad: 4, minimo: 4, vence: "—", ubicacion: "Ambulancia A-13", estado: "Disponible" },
  { codigo: "SN-005", descripcion: "Oxígeno medicinal (balón 10 m³)", cantidad: 3, minimo: 4, vence: "—", ubicacion: "Tópico", estado: "Bajo stock" },
  { codigo: "SN-006", descripcion: "Mascarillas de oxígeno adulto", cantidad: 25, minimo: 15, vence: "06/2027", ubicacion: "Ambulancia A-3", estado: "Disponible" },
  { codigo: "SN-007", descripcion: "Apósitos hemostáticos", cantidad: 8, minimo: 6, vence: "02/2026", ubicacion: "Tópico", estado: "Vencido" },
  { codigo: "SN-008", descripcion: "Férulas inflables (juego)", cantidad: 3, minimo: 2, vence: "—", ubicacion: "Ambulancia A-13", estado: "Disponible" },
];

/* ---------- Indicadores registrados por periodo ---------- */

/**
 * Valor de un KPI cargado por su sección para un periodo. Es lo que
 * alimenta a las secciones cuya fuente es "registro" y a los KPIs que, aun
 * teniendo sección, no salen del inventario ni de la bandeja.
 *
 * TODO(integración): vendrá de GET /indicadores?periodo= en el gateway.
 */
export type RegistroKpi = {
  kpi: string;
  periodo: string;
  valor: number;
  /** Denominador o contexto, para explicar el valor. */
  detalle?: string;
  registradoPor: string;
  fecha: string;
};

export const PERIODO_ACTUAL = "2026-08";

export const REGISTROS_KPI: RegistroKpi[] = [
  { kpi: "tiempo-respuesta", periodo: "2026-08", valor: 6.4, detalle: "Sobre 128 servicios", registradoPor: "Cap. Jorge Quispe", fecha: "31/08/2026" },
  { kpi: "files-actualizados", periodo: "2026-08", valor: 81, detalle: "68 de 84 files", registradoPor: "Brig. Andrés Villanueva", fecha: "29/08/2026" },
  { kpi: "mantenimientos-infraestructura", periodo: "2026-08", valor: 75, detalle: "6 de 8 programados", registradoPor: "Cap. Lucía Herrera", fecha: "30/08/2026" },
  { kpi: "bomberos-capacitados", periodo: "2026-08", valor: 64, detalle: "36 de 56 bomberos", registradoPor: "Tte. Rosa Medina", fecha: "28/08/2026" },
  { kpi: "cumplimiento-capacitacion", periodo: "2026-08", valor: 83, detalle: "5 de 6 programadas", registradoPor: "Tte. Rosa Medina", fecha: "28/08/2026" },
  { kpi: "incidentes", periodo: "2026-08", valor: 2, detalle: "Ambos leves, sin descanso médico", registradoPor: "Secc. Hugo Cárdenas", fecha: "31/08/2026" },
  { kpi: "proyectos-activos", periodo: "2026-08", valor: 4, detalle: "2 en ejecución · 2 en gestión", registradoPor: "Cap. Elena Ríos", fecha: "27/08/2026" },
  { kpi: "convenios", periodo: "2026-08", valor: 1, detalle: "Municipalidad de Cercado de Lima", registradoPor: "Cap. Elena Ríos", fecha: "27/08/2026" },
  { kpi: "recursos-gestionados", periodo: "2026-08", valor: 18400, detalle: "Donación de EPP · 24 juegos", registradoPor: "Cap. Elena Ríos", fecha: "27/08/2026" },
  { kpi: "actividades-difundidas", periodo: "2026-08", valor: 88, detalle: "7 de 8 actividades", registradoPor: "Secc. Paula Torres", fecha: "30/08/2026" },
  { kpi: "actividades-realizadas", periodo: "2026-08", valor: 8, detalle: "3 simulacros · 5 comunitarias", registradoPor: "Secc. Paula Torres", fecha: "30/08/2026" },
];
