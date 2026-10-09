/**
 * Cierre de sesión por inactividad.
 *
 * Módulo sin dependencias a propósito: lo importan el middleware (Edge), el
 * servidor y el vigilante del navegador, y los tres deben usar el mismo
 * límite.
 */

/** Tras 5 minutos sin actividad la sesión se cierra. */
export const INACTIVIDAD_MAXIMA_MS = 5 * 60 * 1000;

/** El aviso aparece cuando falta este tiempo para el cierre. */
export const AVISO_PREVIO_MS = 60 * 1000;

/**
 * Cookie httpOnly con la última actividad vista por el servidor (epoch ms).
 * Es el respaldo del vigilante del navegador: si la pestaña se cerró o
 * quedó dormida, el middleware igual corta la sesión vencida.
 */
export const COOKIE_ACTIVIDAD = "f3_act";

/** Valor de `?motivo=` en `/login` tras un cierre por inactividad. */
export const MOTIVO_INACTIVIDAD = "inactividad";
