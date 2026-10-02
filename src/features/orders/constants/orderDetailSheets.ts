/**
 * Hojas del detalle de pedido (`/orders/[id]`). La hoja activa vive en la URL
 * (`?sheet=`) para que sobreviva a la recarga y se pueda compartir el enlace:
 *
 * - `order` ("Pedido"): el pedido con el formato de la cotización. Es la hoja
 *   por defecto y NO se escribe en la URL.
 * - `progress` ("Avances"): surtido y documentos relacionados.
 *
 * Cualquier otro valor (o ninguno) cae en `order`.
 */
export const ORDER_DETAIL_SHEET_PARAM = "sheet";

export const ORDER_DETAIL_SHEETS = ["order", "progress"] as const;

export type OrderDetailSheet = (typeof ORDER_DETAIL_SHEETS)[number];

export const DEFAULT_ORDER_DETAIL_SHEET: OrderDetailSheet = "order";

/** Valor crudo de la URL → hoja. Desconocido o ausente → hoja por defecto. */
export function resolveOrderDetailSheet(value: string | undefined): OrderDetailSheet {
  // Contra la lista y no contra un objeto: un `?sheet=constructor` no puede
  // resolver a nada heredado de `Object.prototype`.
  return (ORDER_DETAIL_SHEETS as readonly string[]).includes(value ?? "")
    ? (value as OrderDetailSheet)
    : DEFAULT_ORDER_DETAIL_SHEET;
}

/** Parámetros de búsqueda tal como los entrega la página de servidor. */
export type OrderDetailSearchParams = Record<string, string | string[] | undefined>;

/**
 * `href` relativo (solo la query) que abre `sheet` conservando el resto de los
 * parámetros de la URL actual —en particular `from`, del que depende "Volver"—.
 * La hoja por defecto quita el parámetro en vez de escribirlo.
 */
export function buildOrderDetailSheetHref(
  pathname: string,
  searchParams: OrderDetailSearchParams,
  sheet: OrderDetailSheet,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === ORDER_DETAIL_SHEET_PARAM || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      params.append(key, item);
    }
  }
  if (sheet !== DEFAULT_ORDER_DETAIL_SHEET) {
    params.set(ORDER_DETAIL_SHEET_PARAM, sheet);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
