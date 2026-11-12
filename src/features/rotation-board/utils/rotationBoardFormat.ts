import type { AxiosError } from "axios";
import { isValidDateKey } from "@/src/utils/formatDate";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";

/**
 * Formato del tablero de rotación. Todo es puro (sin `Date.now()` ni zona
 * local): las semanas se derivan de `parametros.hasta`, que el backend ya
 * resolvió en hora de México.
 */

const DASH = "—";

const piecesFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const oneDecimalFormat = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const isNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Piezas enteras ("5,758"); `null` → "—". El backend manda `5758.0`. */
export const formatPieces = (value: number | null | undefined): string =>
  isNumber(value) ? piecesFormat.format(Math.round(value)) : DASH;

/**
 * Venta semanal promedio: un RITMO, no un conteo, así que lleva un decimal
 * (`0.08` piezas/semana redondeado a pieza entera se leería como "no se vende").
 */
export const formatWeeklyRate = (value: number | null | undefined): string =>
  isNumber(value) ? oneDecimalFormat.format(value) : DASH;

/** Porcentaje con un decimal y signo explícito si se pide ("+27 %", "−8.4 %"). */
export const formatPercent = (
  value: number | null | undefined,
  { signed = false }: { signed?: boolean } = {},
): string => {
  if (!isNumber(value)) return DASH;
  const text = `${oneDecimalFormat.format(Math.abs(value))} %`;
  if (value < 0) return `−${text}`;
  return signed && value > 0 ? `+${text}` : text;
};

/** Cobertura en semanas ("24.8 sem"). */
export const formatWeeks = (value: number | null | undefined): string =>
  isNumber(value) ? `${oneDecimalFormat.format(value)} sem` : DASH;

/** Día "YYYY-MM-DD" desplazado `days` días, en aritmética UTC (sin zona local). */
export const shiftDateKey = (dateKey: string, days: number): string => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export interface WeekRange {
  /** "YYYY-MM-DD", inclusivo. */
  from: string;
  to: string;
}

/**
 * Rango de cada punto de `serie_semanal`. El backend agrupa en VENTANAS MÓVILES
 * de 7 días que terminan en `hasta` (no semanas de calendario): el índice
 * `semanas − 1` es `hasta − 6 … hasta` y el índice 0 la ventana más antigua.
 * Devuelve `[]` si `hasta` no es una fecha válida.
 */
export const weeklySeriesRanges = (hasta: string, semanas: number): WeekRange[] => {
  if (!isValidDateKey(hasta) || !Number.isInteger(semanas) || semanas < 1) return [];
  return Array.from({ length: semanas }, (_, index) => {
    const weeksAgo = semanas - 1 - index;
    return {
      from: shiftDateKey(hasta, -(7 * weeksAgo + 6)),
      to: shiftDateKey(hasta, -7 * weeksAgo),
    };
  });
};

/** Nombre legible de cada parámetro del tablero, para los errores por campo. */
const PARAM_LABELS: Record<string, string> = {
  semanas: "Semanas de análisis",
  semanas_objetivo: "Semanas objetivo",
  dias_sin_venta: "Días sin venta",
  agrupar: "Agrupar por",
  buscar: "Búsqueda",
  clase: "Clase",
  estado: "Estado",
  solo_candidatos: "Candidatos a descontinuar",
  fabricacion: "Material",
  ordering: "Orden",
  page: "Página",
  page_size: "Filas por página",
  cantidad: "Cantidad",
  variante: "Variante",
};

/**
 * Mensaje de un 400 del tablero a partir de sus errores POR CAMPO
 * (`{"semanas": ["Asegúrese de que este valor es mayor o igual a 1."]}`):
 * "Semanas de análisis: Asegúrese…". Varios campos se unen con " · ". Para
 * cualquier otro error devuelve `undefined` y la tabla usa su mensaje de
 * siempre (`extractErrorMessage`).
 */
export const rotationBoardFieldErrorMessage = (error: unknown): string | undefined => {
  const response = (error as AxiosError | undefined)?.response;
  if (response?.status !== 400) return undefined;
  const data = response.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const messages = Object.entries(data as Record<string, unknown>)
    .map(([field, value]) => {
      const message = firstDrfMessage(value);
      if (!message) return undefined;
      return field === "detail" || field === "non_field_errors"
        ? message
        : `${PARAM_LABELS[field] ?? field}: ${message}`;
    })
    .filter((message): message is string => Boolean(message));
  return messages.length > 0 ? messages.join(" · ") : undefined;
};
