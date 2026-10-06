import type { PurchaseOrder } from "@/src/features/purchase-orders/interfaces/purchase-order.interface";

/**
 * Parámetros de `GET /terceros/proveedores/{id}/historial-ordenes-compra/`.
 *
 * Todos opcionales salvo la paginación, que este cliente siempre envía para
 * que el cálculo de páginas (`count / page_size`) no dependa del default del
 * backend. Las fechas filtran sobre `fecha_oc` y deben ser días REALES: una
 * fecha bien formada pero imposible ("2026-02-30") devuelve 500. El orden es
 * fijo en el backend (`-fecha_oc, -id`); `ordering` no tiene efecto, por eso
 * no se expone.
 */
export interface SupplierPurchaseOrderHistoryParams {
  estatus?: number;
  fecha_inicio?: string;
  fecha_final?: string;
  page: number;
  page_size: number;
}

/** Importe agregado por moneda dentro de `resumen`. */
export interface SupplierPurchaseOrderHistoryMonto {
  /** Código ISO 4217 ("MXN", "USD"). */
  moneda: string;
  /**
   * A diferencia de los importes de `results` (strings decimales), aquí el
   * backend manda un NÚMERO JSON. Se acepta también string por si el contrato
   * se alinea con el resto; `formatMoneyValueOrDash` formatea ambos.
   */
  total: number | string;
}

/**
 * Agregados sobre TODO el conjunto filtrado (no solo la página actual).
 * `monto_por_moneda` excluye únicamente las órdenes canceladas (estatus 6);
 * `total_ordenes` sí las cuenta.
 */
export interface SupplierPurchaseOrderHistoryResumen {
  total_ordenes: number;
  /** Indexado por la ETIQUETA del estatus ("Cancelada"), no por el entero. */
  por_estatus: Record<string, number>;
  monto_por_moneda: SupplierPurchaseOrderHistoryMonto[];
}

/**
 * Respuesta paginada (`PageNumberPagination`) más `resumen`. `results` usa el
 * mismo serializer que el listado de órdenes de compra: los importes llegan
 * SIEMPRE (este endpoint no aplica el filtro contable por rol).
 */
export interface SupplierPurchaseOrderHistoryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PurchaseOrder[];
  resumen: SupplierPurchaseOrderHistoryResumen;
}
