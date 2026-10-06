import { PURCHASE_ORDER_STATUS } from "@/src/features/purchase-orders/constants/purchaseOrderStatus";
import { isCompleteDateEntry } from "@/src/utils/formatDate";
import type { SupplierPurchaseOrderHistoryParams } from "../interfaces/supplier-purchase-order-history.interface";

/**
 * Filtros del historial de órdenes de compra de un proveedor.
 *
 * Viven en la URL de la página del proveedor (`?estatus=&fecha_inicio=&
 * fecha_final=&page=`), que es la fuente de verdad, y la misma lectura la usa
 * el "Volver" del detalle de OC para reconstruir esa URL. Por eso todo lo que
 * sale de aquí está VALIDADO valor por valor: un valor inválido se trata como
 * ausente, nunca se envía al backend ni se copia a un `href`.
 */
export const SUPPLIER_PO_HISTORY_PAGE_SIZE = 20;

export interface SupplierPurchaseOrderHistoryFilters {
  /** Entero 1-6 (ver `PURCHASE_ORDER_STATUS`) o `null` = todos. */
  estatus: number | null;
  /** Día real "yyyy-mm-dd" (año ≥ 1900) o `null`. */
  fecha_inicio: string | null;
  /** Día real "yyyy-mm-dd" (año ≥ 1900) o `null`. */
  fecha_final: string | null;
  /** Entero ≥ 1. */
  page: number;
}

const VALID_ESTATUS: readonly number[] = Object.values(PURCHASE_ORDER_STATUS);


/** Solo dígitos: `Number()` aceptaría "1e1", " 2", "0x3" o "2.0". */
const parsePositiveInt = (value: string | null | undefined): number | null => {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

/** Id de proveedor válido (entero positivo) o `null`. */
export const parseSupplierId = (value: string | null | undefined): number | null =>
  parsePositiveInt(value);

/**
 * Lee los filtros validando cada valor POR SEPARADO. `get` abstrae la fuente
 * (`URLSearchParams.get` en el cliente, el objeto `searchParams` de una página
 * de servidor).
 *
 * Las fechas se conservan aunque formen un rango invertido: cada una es válida
 * por sí sola y el control de fecha debe seguir mostrándola. Quien arma la
 * petición o la URL de regreso descarta el par con {@link isDateRangeInverted}.
 */
export const readSupplierPurchaseOrderHistoryFilters = (
  get: (key: string) => string | null | undefined,
): SupplierPurchaseOrderHistoryFilters => {
  const estatus = parsePositiveInt(get("estatus"));
  const fechaInicio = get("fecha_inicio");
  const fechaFinal = get("fecha_final");
  return {
    estatus: estatus !== null && VALID_ESTATUS.includes(estatus) ? estatus : null,
    fecha_inicio: isCompleteDateEntry(fechaInicio) ? fechaInicio : null,
    fecha_final: isCompleteDateEntry(fechaFinal) ? fechaFinal : null,
    page: parsePositiveInt(get("page")) ?? 1,
  };
};

/** Ambas fechas presentes y la inicial después de la final. */
export const isDateRangeInverted = (filters: SupplierPurchaseOrderHistoryFilters): boolean =>
  filters.fecha_inicio !== null &&
  filters.fecha_final !== null &&
  filters.fecha_inicio > filters.fecha_final;

/** Parámetros de la petición: solo valores válidos, y nunca un rango invertido. */
export const toSupplierPurchaseOrderHistoryParams = (
  filters: SupplierPurchaseOrderHistoryFilters,
): SupplierPurchaseOrderHistoryParams => {
  const inverted = isDateRangeInverted(filters);
  return {
    ...(filters.estatus !== null && { estatus: filters.estatus }),
    ...(!inverted && filters.fecha_inicio !== null && { fecha_inicio: filters.fecha_inicio }),
    ...(!inverted && filters.fecha_final !== null && { fecha_final: filters.fecha_final }),
    page: filters.page,
    page_size: SUPPLIER_PO_HISTORY_PAGE_SIZE,
  };
};

/**
 * Filtros → pares de query para una URL. Se arman SOLO con primitivos ya
 * validados (nunca con la query cruda); `page` se omite en la primera página
 * y un rango invertido se descarta.
 */
export const toSupplierPurchaseOrderHistoryQuery = (
  filters: SupplierPurchaseOrderHistoryFilters,
): URLSearchParams => {
  const query = new URLSearchParams();
  const keepDates = !isDateRangeInverted(filters);
  if (filters.estatus !== null) query.set("estatus", String(filters.estatus));
  if (keepDates && filters.fecha_inicio !== null) query.set("fecha_inicio", filters.fecha_inicio);
  if (keepDates && filters.fecha_final !== null) query.set("fecha_final", filters.fecha_final);
  if (filters.page > 1) query.set("page", String(filters.page));
  return query;
};

/** URL de la página de un proveedor con su historial filtrado. */
export const supplierDetailHref = (
  supplierId: number,
  filters?: SupplierPurchaseOrderHistoryFilters,
): string => {
  const qs = filters ? toSupplierPurchaseOrderHistoryQuery(filters).toString() : "";
  return qs ? `/procurement/suppliers/${supplierId}?${qs}` : `/procurement/suppliers/${supplierId}`;
};
