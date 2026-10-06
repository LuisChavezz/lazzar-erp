import {
  parseSupplierId,
  readSupplierPurchaseOrderHistoryFilters,
  supplierDetailHref,
  toSupplierPurchaseOrderHistoryQuery,
  type SupplierPurchaseOrderHistoryFilters,
} from "@/src/features/suppliers/utils/supplierPurchaseOrderHistoryFilters";

/**
 * Orígenes válidos del detalle de una orden de compra
 * (`/procurement/purchase-orders/[id]?from=<origen>`), mismo patrón que
 * `pedidoDetailOrigins` del detalle de pedido.
 *
 * Cada llave nombra el listado que enlazó al detalle y decide a dónde vuelve su
 * "Volver" (`resolvePurchaseOrderBack`). Sin `from` o con uno desconocido se
 * vuelve al listado de órdenes de compra. Nunca se navega a una URL tomada de
 * la query: solo a destinos fijos o armados con primitivos validados.
 */
export const PURCHASE_ORDER_DETAIL_ORIGINS = ["purchase-order-receipts", "supplier"] as const;

export type PurchaseOrderDetailOrigin = (typeof PURCHASE_ORDER_DETAIL_ORIGINS)[number];

/**
 * Estrecha el `?from=` crudo de la URL. Compara contra el arreglo (no contra
 * las llaves de un objeto), así que `constructor`/`toString` no pasan.
 */
export function isPurchaseOrderDetailOrigin(
  value: string | undefined,
): value is PurchaseOrderDetailOrigin {
  return (
    value !== undefined &&
    (PURCHASE_ORDER_DETAIL_ORIGINS as readonly string[]).includes(value)
  );
}

/**
 * Contexto del origen `supplier`: el proveedor cuyo historial enlazó la OC y
 * los filtros/página con que se estaba viendo, para que el "Volver" regrese
 * exactamente a esa vista.
 */
export interface SupplierOriginContext {
  proveedor: number;
  filters: SupplierPurchaseOrderHistoryFilters;
}

/**
 * Llaves de la query del detalle que alimentan el "Volver" del origen
 * `supplier` (además de `from`). La página de servidor las lee y las pasa
 * CRUDAS; `resolvePurchaseOrderBack` las valida una por una.
 */
export const SUPPLIER_ORIGIN_QUERY_KEYS = [
  "proveedor",
  "estatus",
  "fecha_inicio",
  "fecha_final",
  "page",
] as const;

export type PurchaseOrderBackParams = Partial<
  Record<(typeof SUPPLIER_ORIGIN_QUERY_KEYS)[number], string>
>;

/**
 * URL del detalle de una OC. `from` tipado con `PurchaseOrderDetailOrigin`: un
 * origen mal escrito no compila, en vez de caer en silencio al "Volver" por
 * defecto (misma intención que `PedidoFolioLink` con `PedidoDetailOrigin`). El
 * origen `supplier` EXIGE su contexto.
 */
export function purchaseOrderDetailHref(
  id: number,
  from?: Exclude<PurchaseOrderDetailOrigin, "supplier">,
): string;
export function purchaseOrderDetailHref(
  id: number,
  from: "supplier",
  context: SupplierOriginContext,
): string;
export function purchaseOrderDetailHref(
  id: number,
  from?: PurchaseOrderDetailOrigin,
  context?: SupplierOriginContext,
): string {
  const base = `/procurement/purchase-orders/${id}`;
  if (!from) return base;
  if (from === "supplier" && context) {
    const query = new URLSearchParams({ from, proveedor: String(context.proveedor) });
    toSupplierPurchaseOrderHistoryQuery(context.filters).forEach((value, key) =>
      query.set(key, value),
    );
    return `${base}?${query.toString()}`;
  }
  return `${base}?from=${from}`;
}

// ── "Volver" ─────────────────────────────────────────────────────────────────
// La flecha la pinta el icono del enlace, por eso el label no la lleva.

export interface PurchaseOrderBackTarget {
  href: string;
  label: string;
}

const DEFAULT_BACK: PurchaseOrderBackTarget = {
  href: "/procurement/purchase-orders",
  label: "Volver a Órdenes de Compra",
};

/**
 * Destino de cada origen. Los estáticos son un objeto fijo; `supplier` es una
 * función que reconstruye `/procurement/suppliers/{id}?…` SOLO con primitivos
 * validados uno por uno (los mismos validadores que la página del proveedor):
 * un filtro inválido se descarta y un id de proveedor inválido cae al default.
 */
const BACK_TARGETS: Record<
  PurchaseOrderDetailOrigin,
  PurchaseOrderBackTarget | ((params: PurchaseOrderBackParams) => PurchaseOrderBackTarget)
> = {
  "purchase-order-receipts": {
    href: "/procurement/purchase-order-receipts",
    label: "Volver a Recepciones",
  },
  supplier: (params) => {
    const supplierId = parseSupplierId(params.proveedor);
    if (supplierId === null) return DEFAULT_BACK;
    const filters = readSupplierPurchaseOrderHistoryFilters(
      (key) => params[key as keyof PurchaseOrderBackParams],
    );
    return { href: supplierDetailHref(supplierId, filters), label: "Volver al Proveedor" };
  },
};

/** Resuelve el "Volver" a partir del `?from=` crudo y sus parámetros crudos. */
export const resolvePurchaseOrderBack = (
  from: string | undefined,
  params: PurchaseOrderBackParams = {},
): PurchaseOrderBackTarget => {
  if (!isPurchaseOrderDetailOrigin(from)) return DEFAULT_BACK;
  const target = BACK_TARGETS[from];
  return typeof target === "function" ? target(params) : target;
};
