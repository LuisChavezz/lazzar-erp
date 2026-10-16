import type { KpiUntypedBlock } from "@/src/components/KpiGrid";

/**
 * `GET /compras/ordenes/kpis/` (EC-432): indicadores de órdenes de compra que
 * CALCULA el backend en cada lectura. La UI pinta sus valores tal cual, con UNA
 * excepción deliberada: el total por moneda de "Gasto por categoría" es la suma
 * en el cliente de `gasto_por_categoria.categorias[].monto` DE ESA MONEDA,
 * porque el backend no expone ese total. Nunca se suman monedas distintas.
 *
 * Sin parámetros (cualquiera se ignora), todo el histórico, sin metas ni
 * semáforo. Cada bloque es una unión discriminada sobre `disponible`:
 * CUALQUIERA de los cuatro puede llegar como `{ disponible: false, motivo }`
 * (p. ej. un usuario sin empresa recibe los cuatro así).
 *
 * Importes: NÚMEROS JSON, siempre junto a su `moneda` (código ISO, catálogo
 * abierto): el backend los agrupa por moneda y nunca los suma entre monedas.
 * Sin permiso de contabilidad el backend QUITA la clave `monto` de las filas de
 * `ocs_abiertas` (por eso es opcional) y devuelve `gasto_por_categoria` como
 * `{ disponible: false, motivo }`.
 */

/** Bloque que la fuente no puede calcular; `motivo` es texto para el usuario. */
export interface PurchaseOrderKpiUnavailable {
  disponible: false;
  motivo: string;
}

/**
 * OCs abiertas de UN estatus en UNA moneda: hay una fila por (estatus, moneda),
 * ordenadas por estatus y moneda. `total` cuenta OCs (cada OC tiene una sola
 * moneda, así que los conteos de un estatus sí se pueden sumar entre monedas).
 */
export interface PurchaseOrderKpiStatusBreakdown {
  estatus: number;
  estatus_label: string;
  moneda: string;
  total: number;
  /** `Sum(gran_total)` (con IVA) en `moneda`; ausente sin permiso de contabilidad. */
  monto?: number;
}

/** OCs abiertas de UNA moneda. */
export interface PurchaseOrderKpiOpenCurrency {
  moneda: string;
  total: number;
  /** `Sum(gran_total)` (con IVA) en `moneda`; ausente sin permiso de contabilidad. */
  monto?: number;
}

export interface PurchaseOrderOpenKpiAvailable {
  disponible: true;
  /**
   * OCs en Borrador, Pendiente a confirmar, Autorizada o Parcialmente recibida,
   * de todas las monedas (suma de `por_moneda[].total`).
   */
  total: number;
  /** Una fila por moneda, ordenada por código; vacía sin OCs abiertas. */
  por_moneda: PurchaseOrderKpiOpenCurrency[];
  por_estatus: PurchaseOrderKpiStatusBreakdown[];
}

/** OC abierta cuya `fecha_entrega_estimada` ya pasó. */
export interface PurchaseOrderKpiOverdueOrder {
  oc_id: number;
  folio: string | null;
  /** Fecha-calendario "YYYY-MM-DD". */
  fecha_entrega_estimada: string;
  dias_vencida: number;
}

export interface PurchaseOrderOverdueKpiAvailable {
  disponible: true;
  total: number;
  /** Como MÁXIMO 20 filas, sin paginación; el total real es `total`. */
  drill_down: PurchaseOrderKpiOverdueOrder[];
}

/** Gasto de UNA categoría en UNA moneda. */
export interface PurchaseOrderKpiCategory {
  /** Nombre de la categoría de producto; "Sin categoría" para los que no tienen. */
  categoria: string;
  moneda: string;
  monto: number;
}

export interface PurchaseOrderSpendKpiAvailable {
  disponible: true;
  /**
   * `importe` de las líneas (sin IVA) de OCs Autorizada, Parcialmente recibida
   * y Recibida: una fila por (categoría, moneda), ordenadas por moneda y luego
   * `-monto`, sin tope. Una categoría con gasto en dos monedas trae dos filas.
   */
  categorias: PurchaseOrderKpiCategory[];
}

export type PurchaseOrderOpenKpi = PurchaseOrderOpenKpiAvailable | PurchaseOrderKpiUnavailable;
export type PurchaseOrderOverdueKpi = PurchaseOrderOverdueKpiAvailable | PurchaseOrderKpiUnavailable;
export type PurchaseOrderSpendKpi = PurchaseOrderSpendKpiAvailable | PurchaseOrderKpiUnavailable;

export interface PurchaseOrderKpis {
  /** Datetime UTC del cálculo. */
  generado_en: string;
  ocs_abiertas: PurchaseOrderOpenKpi;
  ocs_vencidas_sin_recibir: PurchaseOrderOverdueKpi;
  /** Hoy SIEMPRE llega no disponible: solo se tipa la bandera. */
  ciclo_compra: KpiUntypedBlock;
  gasto_por_categoria: PurchaseOrderSpendKpi;
}
