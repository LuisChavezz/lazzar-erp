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
