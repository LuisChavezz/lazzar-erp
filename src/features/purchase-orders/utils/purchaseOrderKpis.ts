import type {
  PurchaseOrderKpiCategory,
  PurchaseOrderKpiStatusBreakdown,
} from "../interfaces/purchase-order-kpis.interface";

import { canSeeKpiAmounts } from "@/src/utils/kpiAmounts";

/**
 * `canSeeKpiAmounts` y `HIDDEN_KPI_AMOUNT_TEXT` viven en `src/utils/kpiAmounts`
 * (los usan también pedidos y clientes); se reexportan aquí para los
 * importadores de compras. En compras la bandera la manda cada respuesta de
 * KPIs de OC, recepciones y proveedores (mismo criterio que el filtro contable
 * del listado de OC) y llega siempre, también sin empresa (`false`, #860).
 */
export { canSeeKpiAmounts, HIDDEN_KPI_AMOUNT_TEXT } from "@/src/utils/kpiAmounts";

/**
 * ¿Una tarjeta que es SOLO un importe va como "No visible"? Sin permiso el
 * backend manda esos bloques no disponibles (`Sin permiso de contabilidad.`),
 * así que la bandera manda sobre su `disponible`. Excepción: un usuario sin
 * empresa también recibe `puede_ver_importes: false` (#860), pero ahí el
 * bloque no está disponible por falta de empresa y debe verse SU motivo
 * ("Usuario sin empresa asignada."), no el de permiso. Cada respuesta dice a su
 * manera que no hay empresa; el llamador lo pasa en `sinEmpresa`.
 */
export const isAmountOnlyKpiHidden = (puedeVerImportes: boolean | undefined, sinEmpresa: boolean): boolean =>
  !sinEmpresa && !canSeeKpiAmounts(puedeVerImportes);

/** El porqué, para el ⓘ de la tarjeta. */
export const HIDDEN_KPI_AMOUNTS_REASON = "No tienes permiso para ver los importes de compras.";

/** Un estatus de OCs abiertas con sus monedas (`por_estatus` agrupado). */
export interface PurchaseOrderKpiStatusGroup {
  estatus: number;
  estatus_label: string;
  /** OCs del estatus en todas sus monedas: cada OC tiene una sola moneda. */
  total: number;
  /** Una fila por moneda, en el orden del backend; los importes NO se suman. */
  monedas: { moneda: string; total: number; monto?: number }[];
}

/**
 * Agrupa `por_estatus` (una fila por estatus y moneda) por estatus, ordenado
 * por estatus (avance del ciclo). Suma solo conteos; los importes quedan por
 * moneda.
 */
export const groupPurchaseOrderKpiStatuses = (
  rows: PurchaseOrderKpiStatusBreakdown[],
): PurchaseOrderKpiStatusGroup[] => {
  const groups = new Map<number, PurchaseOrderKpiStatusGroup>();
  for (const row of rows) {
    const group = groups.get(row.estatus) ?? {
      estatus: row.estatus,
      estatus_label: row.estatus_label,
      total: 0,
      monedas: [],
    };
    group.total += row.total;
    group.monedas.push({ moneda: row.moneda, total: row.total, monto: row.monto });
    groups.set(row.estatus, group);
  }
  return [...groups.values()].sort((a, b) => a.estatus - b.estatus);
};

/** El gasto por categoría de UNA moneda: su total y su ranking de categorías. */
export interface PurchaseOrderKpiSpendCurrency {
  moneda: string;
  /** Suma de las categorías de ESTA moneda (el backend no expone el total). */
  total: number;
  /** De mayor a menor monto (orden del backend). */
  categorias: PurchaseOrderKpiCategory[];
}

/**
 * Agrupa `gasto_por_categoria.categorias` (una fila por categoría y moneda) en
 * un ranking por moneda. Conserva el orden del backend (moneda, `-monto`).
 */
export const groupPurchaseOrderKpiSpend = (rows: PurchaseOrderKpiCategory[]): PurchaseOrderKpiSpendCurrency[] => {
  const groups = new Map<string, PurchaseOrderKpiSpendCurrency>();
  for (const row of rows) {
    const group = groups.get(row.moneda) ?? { moneda: row.moneda, total: 0, categorias: [] };
    group.total += row.monto;
    group.categorias.push(row);
    groups.set(row.moneda, group);
  }
  return [...groups.values()];
};
