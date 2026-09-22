import type { DataTableFilterOption } from "@/src/components/DataTable";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";

// ─── Opciones de filtro por columna ─────────────────────────────────────────
//
// Antes alimentaban el panel de filtros tipo "chips" de la barra de
// herramientas (`DataTable`'s `filterConfig`); ahora alimentan los
// desplegables DENTRO de los encabezados de columna (O.C./Estatus y
// Proveedor, ver `PurchaseOrderColumns.tsx`) — el patrón al que el usuario
// está acostumbrado (filtro por columna, como una hoja de cálculo). Se
// mantienen aquí, separadas de las columnas, porque ambas requieren recorrer
// TODA la lista para deduplicar valores, y `getColumns` no la recibe.

/** Construye las opciones de estatus a partir de las órdenes de compra. */
export function buildStatusOptions(
  orders: PurchaseOrder[],
): DataTableFilterOption[] {
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
export function buildSupplierOptions(
  orders: PurchaseOrder[],
): DataTableFilterOption[] {
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
