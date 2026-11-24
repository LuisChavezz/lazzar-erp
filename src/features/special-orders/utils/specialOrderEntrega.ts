import { formatDeadlineText } from "@/src/utils/formatDeadlineText";
import { getMexicoTodayDate } from "@/src/utils/mexicoTime";

/** Días de calendario entre dos llaves `YYYY-MM-DD` (b − a). */
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/**
 * Días que faltan para la fecha compromiso (negativo = vencida), contra el día
 * de México de `nowMs`. NaN si `fecha` no empieza con `YYYY-MM-DD`.
 */
export const entregaDias = (fecha: string, nowMs: number): number =>
  daysBetween(getMexicoTodayDate(new Date(nowMs)), fecha.slice(0, 10));

/**
 * Texto de la columna Entrega ("Faltan 30 días", "Vencido hace 2 días"), en
 * masculino por el pedido; `null` si la fecha no se puede leer.
 */
export const entregaLabel = (fecha: string, nowMs: number): string | null =>
  formatDeadlineText(entregaDias(fecha, nowMs), { gender: "m" });
