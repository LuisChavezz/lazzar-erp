import type { DataTableFilterConfig } from "@/src/components/DataTable";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Construye las opciones de estatus a partir de las órdenes de compra. */
function buildStatusOptions(
  orders: PurchaseOrder[],
): { value: string; label: string }[] {
  const map = new Map<number, string>();
  for (const order of orders) {
    const id = order.estatus;
    const label = order.estatus_label;
    if (id != null && label && !map.has(id)) {
      map.set(id, label);
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([id, label]) => ({
      value: String(id),
      label,
    }));
}

/** Construye las opciones de proveedor a partir de las órdenes de compra. */
function buildSupplierOptions(
  orders: PurchaseOrder[],
): { value: string; label: string }[] {
  const map = new Map<number, string>();
  for (const order of orders) {
    const id = order.proveedor;
    const nombre = order.proveedor_nombre;
    if (id != null && nombre && !map.has(id)) {
      map.set(id, nombre);
    }
  }
  return Array.from(map.entries())
    .sort(([, a], [, b]) => a.localeCompare(b))
    .map(([id, nombre]) => ({
      value: String(id),
      label: nombre,
    }));
}

// ─── Factory de configuración de filtros ─────────────────────────────────────

/**
 * Crea la configuración de filtros para la tabla de órdenes de compra.
 * Debe llamarse dentro de un `useMemo` con las órdenes como dependencia.
 */
export function createPurchaseOrdersFilterConfig(
  orders: PurchaseOrder[],
): DataTableFilterConfig[] {
  return [
    {
      id: "estatus",
      label: "Estatus",
      options: buildStatusOptions(orders),
    },
    {
      id: "proveedor",
      label: "Proveedor",
      options: buildSupplierOptions(orders),
    },
  ];
}
