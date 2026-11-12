import type {
  ProductionOrderConsumo,
  ProductionOrderConsumoResumen,
} from "@/src/features/production-orders/interfaces/production-order.interface";

/** Rótulo de un producto cuyo nombre el backend mandó en `null`. */
export const productFallbackName = (producto: number): string => `Producto #${producto}`;

/** Nombre de un material del resumen de consumos, con el rótulo de respaldo. */
export const consumptionProductName = (
  row: Pick<ProductionOrderConsumoResumen, "producto" | "producto_nombre">,
): string => row.producto_nombre?.trim() || productFallbackName(row.producto);

/** Registro de consumo para el historial, rotulado como original o ajuste. */
export interface LabeledConsumptionRecord {
  record: ProductionOrderConsumo;
  /** Es el consumo inicial de la OP; los demás registros son ajustes. */
  isOriginal: boolean;
}

/**
 * Registros en bruto del más antiguo al más reciente, rotulados para el
 * historial. El "Original" es el consumo inicial con la MISMA regla con que el
 * backend arma `consumos_resumen` (EC-880): el primer registro de la OP que
 * tiene renglones. Un registro vacío anterior (un alta de encabezado sin
 * renglones) no lo es: si lo fuera, el historial contradiría al resumen.
 */
export const labelConsumptionRecords = (
  consumos: readonly ProductionOrderConsumo[],
): LabeledConsumptionRecord[] => {
  const sorted = [...consumos].sort((a, b) => a.consumo_produccion_id - b.consumo_produccion_id);
  const original = sorted.find((record) => record.detalles.length > 0);
  return sorted.map((record) => ({ record, isOriginal: record === original }));
};
