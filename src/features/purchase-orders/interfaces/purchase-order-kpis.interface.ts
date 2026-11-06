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

/**
 * Conteos por grupo de estatus del dashboard de Compras (EC-782). "Activas" =
 * todo menos canceladas (6); "en curso" = parcialmente recibidas (4).
 */
export interface PurchaseOrderGroupsKpiAvailable {
  disponible: true;
  activas: number;
  /** Borrador o pendiente de autorización (1-2). */
  por_autorizar: number;
  /** Autorizadas, parcialmente recibidas o recibidas (3-5). */
  autorizadas_o_completadas: number;
  en_curso: number;
  recibidas: number;
  canceladas: number;
}

/**
 * Valor de las OC activas (≠ 6) POR MONEDA: Σ `gran_total`. `monto` AUSENTE sin
 * permiso de importes (`puede_ver_importes: false`).
 */
export interface PurchaseOrderActiveValueKpiAvailable {
  disponible: true;
  total: number;
  por_moneda: PurchaseOrderKpiOpenCurrency[];
}

/** Una OC del top por valor de su moneda. */
export interface PurchaseOrderKpiTopOrder {
  id: number;
  folio: string | null;
  gran_total: number | string;
  moneda_codigo: string | null;
  proveedor_nombre: string | null;
}

/**
 * Las 5 OC activas de mayor `gran_total` DENTRO de cada moneda. Sin permiso de
 * importes llega `{ disponible: false }` completo: el ranking mismo delata
 * cuáles valen más.
 */
export interface PurchaseOrderTopKpiAvailable {
  disponible: true;
  monedas: { moneda: string | null; ocs: PurchaseOrderKpiTopOrder[] }[];
}

/** Una OC en curso (estatus 4) por entregar. */
export interface PurchaseOrderKpiInProgressOrder {
  id: number;
  folio: string | null;
  proveedor_nombre: string | null;
  /** Fecha-calendario "AAAA-MM-DD", o `null` (van al final). */
  fecha_entrega_estimada: string | null;
}

/** Las 8 OC en estatus 4 con la entrega estimada más próxima. */
export interface PurchaseOrderInProgressKpiAvailable {
  disponible: true;
  drill_down: PurchaseOrderKpiInProgressOrder[];
  /** Cuántas hay en total (= `ocs_por_grupo.en_curso`). */
  drill_down_total: number;
  drill_down_truncado: boolean;
}

export type PurchaseOrderGroupsKpi = PurchaseOrderGroupsKpiAvailable | PurchaseOrderKpiUnavailable;
export type PurchaseOrderActiveValueKpi =
  | PurchaseOrderActiveValueKpiAvailable
  | PurchaseOrderKpiUnavailable;
export type PurchaseOrderTopKpi = PurchaseOrderTopKpiAvailable | PurchaseOrderKpiUnavailable;
export type PurchaseOrderInProgressKpi =
  | PurchaseOrderInProgressKpiAvailable
  | PurchaseOrderKpiUnavailable;

export interface PurchaseOrderKpis {
  /** Datetime UTC del cálculo. */
  generado_en: string;
  ocs_abiertas: PurchaseOrderOpenKpi;
  ocs_vencidas_sin_recibir: PurchaseOrderOverdueKpi;
  /** Hoy SIEMPRE llega no disponible: solo se tipa la bandera. */
  ciclo_compra: KpiUntypedBlock;
  gasto_por_categoria: PurchaseOrderSpendKpi;
  /** Dashboard de Compras (EC-782). */
  ocs_por_grupo: PurchaseOrderGroupsKpi;
  valor_ocs_activas: PurchaseOrderActiveValueKpi;
  top_ocs_por_moneda: PurchaseOrderTopKpi;
  ocs_en_curso_proxima_entrega: PurchaseOrderInProgressKpi;
  /** Siempre llega; `false` también para un usuario sin empresa (ver `canSeeKpiAmounts`). */
  puede_ver_importes: boolean;
}
