import { safeParseAmount } from "@/src/utils/formatCurrency";
import type { PurchaseOrderDetail } from "../interfaces/purchase-order.interface";

/**
 * ¿Este usuario puede ver los importes de la orden?
 *
 * El backend no manda los campos financieros en `null`: ELIMINA la clave de la
 * respuesta cuando el rol no tiene visibilidad financiera. Por eso la señal es
 * `undefined` y no un valor vacío. Se consultan varios campos —y no solo
 * `gran_total`— por el mismo motivo que `canSeeAccounting` en
 * `PedidoDetailContent`: basta con que el filtro deje pasar uno para que la
 * sección tenga algo que mostrar.
 *
 * Vive aquí y no en cada vista porque lo consumen las DOS presentaciones del
 * mismo detalle —`PurchaseOrderPageContent` (página) y
 * `PurchaseOrderDetailDialog` (modal)—, y una divergencia entre ambas haría que
 * el mismo usuario viera importes en una y no en la otra.
 *
 * OJO: NO es la misma pregunta que "¿los renglones traen importes?". El filtro
 * del backend actúa sobre la cabecera y sobre el detalle por separado, así que
 * cada vista evalúa el suyo aparte (`hasLineAmounts`) y no se asume que uno
 * implique el otro.
 */
export const canSeeAmounts = (order: PurchaseOrderDetail): boolean =>
  order.gran_total !== undefined ||
  order.total !== undefined ||
  order.subtotal !== undefined;

/**
 * Porcentaje de IVA sin ceros de relleno: el backend lo manda como decimal
 * ("0.00", "16.00") y pintarlo crudo daba etiquetas como "IVA 0.00%".
 * `maximumFractionDigits: 2` conserva un porcentaje fraccionario real
 * ("8.25" → "8.25%") en vez de redondearlo.
 */
export const formatIvaPercent = (value: string): string =>
  new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safeParseAmount(value));
