import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
import type {
  PurchaseOrderKpiCategory,
  PurchaseOrderKpiStatusBreakdown,
} from "../interfaces/purchase-order-kpis.interface";

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
 * Señal del listado de OC: el listado elimina `gran_total` a quien no tiene
 * `puede_ver_contabilidad` (la sesión no trae ese permiso). Se lee de
 * `usePurchaseOrders` (misma caché que la tabla, sin petición extra). Solo
 * `visible` muestra importes, y siempre junto con que el bloque de KPIs los
 * traiga (`resolveKpiAmountState`): los endpoints de KPIs de OC y de recepciones
 * ya quitan los importes sin ese permiso.
 *
 * Decide por `hasLoaded` (hubo alguna respuesta exitosa) y no por
 * `isLoading`/`isError`: en un refetch del listado —incluso uno fallido— se
 * conserva la última respuesta, así que el estado no parpadea.
 *
 * OJO: NO es exclusivo de esta pantalla. Los indicadores de Recepciones
 * (`PurchaseOrderReceiptKpisSection`, `GET /compras/recepciones/kpis/`) lo usan
 * con la misma señal.
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

/** Por qué un indicador no muestra importes (texto del ⓘ según el caso). */
export type KpiHiddenAmountsReason = "no-permission" | "undetermined";

export type KpiAmountState = { show: true } | { show: false; reason: KpiHiddenAmountsReason };

/**
 * ¿Muestra importes un bloque de KPIs de compras? Solo si el listado de OC dice
 * `visible` Y el bloque los trae. El backend quita las claves de importe SOLO a
 * quien no tiene permiso de contabilidad, así que un bloque sin ellas es falta
 * de permiso, diga lo que diga el listado. Usado por los indicadores de OC y de
 * recepciones. `pending` no llega aquí (las tarjetas con importes esperan).
 */
export const resolveKpiAmountState = (
  visibility: PurchaseOrderKpiAmountVisibility,
  carriesAmounts: boolean,
): KpiAmountState => {
  if (!carriesAmounts || visibility === "no-permission") return { show: false, reason: "no-permission" };
  if (visibility === "visible") return { show: true };
  return { show: false, reason: "undetermined" };
};

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
