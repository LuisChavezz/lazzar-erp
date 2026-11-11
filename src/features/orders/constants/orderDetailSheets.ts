/**
 * Hojas del detalle de pedido (`/orders/[id]`). La hoja activa vive en la URL
 * (`?sheet=`) para que sobreviva a la recarga y se pueda compartir el enlace:
 *
 * - `order` ("Pedido"): el pedido con el formato de la cotización. Es la hoja
 *   por defecto y NO se escribe en la URL.
 * - `progress` ("Avances"): surtido y documentos relacionados.
 * - `history` ("Historial", EC-854): la línea de tiempo de la bitácora de
 *   documentos (el pedido y sus derivados). Solo existe para quien puede leer
 *   la bitácora (`R-CORE` o `R-CORE-REPORTES`); sin ese permiso
 *   `?sheet=history` cae en `order`, como cualquier valor desconocido.
 *
 * Cualquier otro valor (o ninguno) cae en `order`.
 */
export const ORDER_DETAIL_SHEET_PARAM = "sheet";

export const ORDER_DETAIL_SHEETS = ["order", "progress", "history"] as const;

export type OrderDetailSheet = (typeof ORDER_DETAIL_SHEETS)[number];

export const DEFAULT_ORDER_DETAIL_SHEET: OrderDetailSheet = "order";

/** Hoja que solo ve quien puede leer la bitácora de documentos. */
export const ORDER_HISTORY_SHEET: OrderDetailSheet = "history";

/**
 * Hojas que se le ofrecen al usuario, en el orden del selector. "Historial"
 * solo con `canSeeHistory`.
 */
export function availableOrderDetailSheets(canSeeHistory: boolean): readonly OrderDetailSheet[] {
  return canSeeHistory
    ? ORDER_DETAIL_SHEETS
    : ORDER_DETAIL_SHEETS.filter((sheet) => sheet !== ORDER_HISTORY_SHEET);
}

/**
 * Valor crudo de la URL → hoja. Desconocido, ausente o no disponible para el
 * usuario (`history` sin `canSeeHistory`) → hoja por defecto.
 */
export function resolveOrderDetailSheet(
  value: string | undefined,
  { canSeeHistory }: { canSeeHistory: boolean },
): OrderDetailSheet {
  // Contra la lista y no contra un objeto: un `?sheet=constructor` no puede
  // resolver a nada heredado de `Object.prototype`.
  return (availableOrderDetailSheets(canSeeHistory) as readonly string[]).includes(value ?? "")
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
