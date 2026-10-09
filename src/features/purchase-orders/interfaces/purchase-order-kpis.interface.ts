import type { KpiUntypedBlock } from "@/src/components/KpiGrid";

/**
 * `GET /compras/ordenes/kpis/` (EC-432): indicadores de órdenes de compra que
 * CALCULA el backend en cada lectura. La UI pinta sus valores tal cual, con UNA
 * excepción deliberada: el valor de la tarjeta "Gasto por categoría" es la suma
 * en el cliente de `gasto_por_categoria.categorias[].monto`, porque el backend
 * no expone ese total.
 *
 * Sin parámetros (cualquiera se ignora), todo el histórico, sin metas ni
 * semáforo. Cada bloque es una unión discriminada sobre `disponible`:
 * CUALQUIERA de los cuatro puede llegar como `{ disponible: false, motivo }`
 * (p. ej. un usuario sin empresa recibe los cuatro así).
 *
 * Importes: NÚMEROS JSON sin `moneda` que suman MXN y USD sin convertir
 * (defecto conocido del backend), así que se pintan sin símbolo. Van OPCIONALES
 * porque, una vez corregido el backend (#373), se espera que la clave NO llegue
 * a un usuario sin permiso de contabilidad, igual que en el listado de OC.
 */

/** Bloque que la fuente no puede calcular; `motivo` es texto para el usuario. */
export interface PurchaseOrderKpiUnavailable {
  disponible: false;
  motivo: string;
}

/** OCs abiertas de UN estatus (solo llegan los estatus con datos, sin orden). */
export interface PurchaseOrderKpiStatusBreakdown {
  estatus: number;
  estatus_label: string;
  total: number;
  monto?: number;
}

export interface PurchaseOrderOpenKpiAvailable {
  disponible: true;
  /** OCs en Borrador, Pendiente a confirmar, Autorizada o Parcialmente recibida. */
  total: number;
  /** Suma de `gran_total` (con IVA) de esas OCs. */
  monto?: number;
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

export interface PurchaseOrderKpiCategory {
  /** Nombre de la categoría de producto; "Sin categoría" para los que no tienen. */
  categoria: string;
  monto?: number;
}

export interface PurchaseOrderSpendKpiAvailable {
  disponible: true;
  /**
   * `importe` de las líneas (sin IVA) de OCs Autorizada, Parcialmente recibida
   * y Recibida, por categoría. Ordenadas por `-monto`, sin tope.
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
