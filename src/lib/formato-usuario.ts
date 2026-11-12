/**
 * Reglas del nombre de usuario de las cuentas compartidas. Módulo puro (sin
 * dependencias de servidor) para usarlo tanto en el formulario cliente como
 * en la server action.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

/**
 * Formato de los nombres de usuario de las cuentas compartidas: entre
 * `USERNAME_MIN` y `USERNAME_MAX` caracteres, solo minúsculas sin tildes,
 * números y separadores `.`, `_` o `-` (nunca al inicio, al final ni
 * seguidos). Coincide con los usuarios existentes (`jefatura`,
 * `serviciogeneral`…). Devuelve el motivo del rechazo o `null` si cumple.
 */
export function validarUsername(username: string): string | null {
  if (username.length < USERNAME_MIN) {
    return `El nuevo usuario debe tener al menos ${USERNAME_MIN} caracteres.`;
  }
  if (username.length > USERNAME_MAX) {
    return `El nuevo usuario no puede tener más de ${USERNAME_MAX} caracteres.`;
  }
  if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(username)) {
    return "Usa solo minúsculas sin tildes, números y . _ - (sin espacios ni al inicio o final).";
  }
  return null;
}
