import { formatMoneyValue, NO_CURRENCY_FORMAT } from "@/src/utils/formatCurrency";
import { parseLocalDate } from "@/src/utils/formatDate";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";

/**
 * Visibilidad de los importes de los indicadores de OC:
 * - `pending`: el listado aún no responde por primera vez; la sección espera
 *   en skeleton para no pintar tarjetas sin importes y luego "aparecerlos".
 * - `visible`: alguna fila del listado trae `gran_total`.
 * - `no-permission`: el listado trae filas y NINGUNA trae `gran_total`: el
 *   backend se los quitó por falta de permiso de contabilidad.
 * - `undetermined`: el listado falló sin haber cargado nunca, o llegó vacío; no
 *   hay forma de saber si el usuario puede verlos, así que se ocultan sin
 *   afirmar que sea por permiso.
 */
export type PurchaseOrderKpiAmountVisibility = "pending" | "visible" | "no-permission" | "undetermined";

/**
 * ¿Se pueden mostrar los importes de los indicadores de OC?
 *
 * PARCHE TEMPORAL por el issue #373 del backend: `GET /compras/ordenes/kpis/`
 * devuelve importes a CUALQUIER usuario autenticado, mientras que el listado
 * de OC ya los elimina (`gran_total` ausente) para quien no tiene
 * `puede_ver_contabilidad`. La sesión no trae ese permiso, así que la señal es
 * el propio listado (`usePurchaseOrders`, misma caché que la tabla, sin
 * petición extra). Solo `visible` muestra importes.
 *
 * Decide por `hasLoaded` (hubo alguna respuesta exitosa) y no por
 * `isLoading`/`isError`: en un refetch del listado —incluso uno fallido— se
 * conserva la última respuesta, así que el estado no parpadea.
 *
 * Cuando el backend aplique el filtro en `kpis`, la condición sobre el listado
 * sobra: basta con que el `monto` del bloque llegue (cada tarjeta ya lo
 * comprueba aparte). Entonces este helper se puede borrar.
 */
export const getPurchaseOrderKpiAmountVisibility = ({
  orders,
  hasLoaded,
  isError,
}: {
  orders: PurchaseOrder[];
  hasLoaded: boolean;
  isError: boolean;
}): PurchaseOrderKpiAmountVisibility => {
  if (!hasLoaded) return isError ? "undetermined" : "pending";
  if (orders.length === 0) return "undetermined";
  return orders.some((order) => order.gran_total !== undefined) ? "visible" : "no-permission";
};

/** Importe del backend sin símbolo: el payload no trae moneda y mezcla MXN y USD. */
export const formatKpiMonto = (value: number): string => formatMoneyValue(value, NO_CURRENCY_FORMAT);

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };

/**
 * Fecha-calendario "YYYY-MM-DD" (`fecha_entrega_estimada`) como "06/10/2026",
 * mismo formato que los indicadores de OP y de clientes. Pasa por
 * `parseLocalDate`: con `new Date()` sería medianoche UTC y en México saldría
 * el día anterior. "—" sin valor o si no se puede leer.
 */
export const formatKpiDate = (value: string | null): string => {
  const date = parseLocalDate(value);
  return date ? date.toLocaleDateString("es-MX", DATE_FORMAT) : "—";
};

/** "1 OC" / "3 OCs": la palabra según el conteo. */
export const plural = (count: number, singular: string, pluralForm: string): string =>
  count === 1 ? singular : pluralForm;
