import { parsePositiveId } from "@/src/utils/parsePositiveId";
import {
  csvEnumParam,
  defineServerTable,
  type ServerTableParam,
} from "@/src/utils/serverTableParams";
import { KANBAN_COLUMNS } from "../constants/kanbanColumns";
import { SIN_CLIENTE } from "../interfaces/quote-list.interface";

/**
 * Parámetros del listado de cotizaciones en MODO SERVIDOR (EC-809 sobre el
 * contrato de EC-811). Todo es puro: lo leen la tabla (`useQuotesTable`), los
 * KPIs y las pruebas.
 */

/** Estatus del catálogo como texto (`?estatus=1,4`), en su orden: el del tablero (EC-751). */
export const QUOTE_ESTATUS_VALUES: readonly string[] = KANBAN_COLUMNS.map((column) =>
  String(column.estatus),
);

/** `?cliente=<id>` o `?cliente=sin_cliente`. Cualquier otro valor es inválido (ausente). */
export const quoteClienteParam: ServerTableParam<number | typeof SIN_CLIENTE> = {
  parse: (raw) => (raw === SIN_CLIENTE ? SIN_CLIENTE : parsePositiveId(raw)),
  serialize: (value) => String(value),
};

/**
 * Campos de `?ordering=` que la tabla ofrece, todos en la lista blanca del
 * backend. `importe_sin_iva` ordena agrupando por moneda (código; sin moneda
 * al final en ascendente), como hacía la columna en memoria (EC-618).
 */
export const QUOTE_ORDERING_FIELDS = [
  "id",
  "estatus",
  "created_at",
  "cliente__razon_social",
  "importe_sin_iva",
] as const;

/**
 * Contrato de la tabla con `GET /ventas/cotizaciones/`.
 *
 * - `estatus` acepta uno o varios (CSV): el filtro del encabezado escribe uno,
 *   y una URL con varios (`?estatus=1,4`) sigue valiendo.
 * - Orden por defecto `-created_at` con `-id` de desempate: el mismo del
 *   backend sin `?ordering=` y el del tablero.
 */
export const quotesTable = defineServerTable({
  filters: {
    estatus: csvEnumParam(QUOTE_ESTATUS_VALUES),
    cliente: quoteClienteParam,
  },
  search: { param: "q" },
  ordering: {
    fields: QUOTE_ORDERING_FIELDS,
    default: "-created_at",
    tiebreaker: "-id",
  },
});

/** `yyyy-mm-dd` del día LOCAL de `date` (no el de UTC). */
const toLocalIsoDate = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

/** Días que abarca el indicador "Cotizaciones · 30 días", hoy incluido. */
export const QUOTE_RECENT_DAYS = 30;

/**
 * Rango de `kpis/` de los últimos 30 días con hoy incluido: `fecha_desde` =
 * hoy − 29 y `fecha_hasta` = hoy, en el día LOCAL del navegador. El backend
 * compara contra el día local de `created_at` (ambos inclusivos).
 */
export const getRecentQuotesRange = (now: Date): { fecha_desde: string; fecha_hasta: string } => {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (QUOTE_RECENT_DAYS - 1));
  return { fecha_desde: toLocalIsoDate(from), fecha_hasta: toLocalIsoDate(now) };
};
