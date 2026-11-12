// Devuelve la fecha de hoy + N días en formato dd/mm/aaaa, en hora de Lima.
export function fechaFutura(dias: number): string {
  const d = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  const partes = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(d);
  const get = (tipo: string) => partes.find(p => p.type === tipo)!.value;
  return `${get('day')}/${get('month')}/${get('year')}`;
}