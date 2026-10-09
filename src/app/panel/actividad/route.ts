/**
 * Pulso de actividad del vigilante de inactividad.
 *
 * No hace nada por sí mismo: el middleware ya renovó la cookie de actividad
 * al pasar por aquí, o redirigió al login si la sesión había vencido.
 */
export function POST() {
  return new Response(null, { status: 204 });
}
