import type {
  PurchaseOrderKpiCategory,
  PurchaseOrderKpiStatusBreakdown,
} from "../interfaces/purchase-order-kpis.interface";

/**
 * ¿Puede el usuario ver los importes de un indicador de compras? Lo dice cada
 * respuesta de KPIs de OC, recepciones y proveedores (`puede_ver_importes`,
 * mismo criterio que el filtro contable del listado de OC). Ausente cuenta como
 * `false`: el backend no lo manda en la respuesta de un usuario sin empresa.
 */
export const canSeeKpiAmounts = (puedeVerImportes: boolean | undefined): boolean =>
  puedeVerImportes === true;

/**
 * ¿Una tarjeta que es SOLO un importe va como "No visible"? Sin permiso el
 * backend manda esos bloques no disponibles (`Sin permiso de contabilidad.`),
 * así que un `false` explícito manda sobre su `disponible`. Sin la bandera
 * (usuario sin empresa) el bloque conserva su propio motivo.
 */
export const isAmountOnlyKpiHidden = (disponible: boolean, puedeVerImportes: boolean | undefined): boolean =>
  puedeVerImportes === false || (disponible && !canSeeKpiAmounts(puedeVerImportes));

/** Lo que ocupa el lugar de un importe que el usuario no puede ver. */
export const HIDDEN_KPI_AMOUNT_TEXT = "No visible";

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
