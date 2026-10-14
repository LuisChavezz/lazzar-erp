import type { ProductionOrderConsumo } from "@/src/features/production-orders/interfaces/production-order.interface";
import {
  formatScaledQuantity,
  parseQuantity,
  type ScaledQuantity,
} from "./consumptionQuantity";

/** Un registro de consumo que contiene al producto, con lo que aporta. */
export interface ProductConsumptionRecord {
  consumo_produccion_id: number;
  /** Suma de los renglones del producto en ESTE registro (4 decimales, con signo). */
  cantidad: string;
  /** Es el registro del que sale lo planeado de este producto. */
  isOriginal: boolean;
}

/** Consumo de UN producto en la OP, derivado de todos sus registros. */
export interface ProductConsumption {
  producto: number;
  /** Nombre del backend, o `productFallbackName(producto)` si nunca llegó. */
  producto_nombre: string;
  /** Lo del registro más antiguo (menor `consumo_produccion_id`) que lo contiene. */
  planned: string;
  /** `current − planned`: lo que sumaron los ajustes posteriores (con signo). */
  adjustments: string;
  /** Suma de sus renglones en TODOS los registros. */
  current: string;
  /** Registros que lo contienen, del más antiguo al más reciente. */
  records: ProductConsumptionRecord[];
}

/** Rótulo de un producto cuyo nombre el backend mandó en `null`. */
export const productFallbackName = (producto: number): string => `Producto #${producto}`;

const byRecordId = (a: ProductionOrderConsumo, b: ProductionOrderConsumo) =>
  a.consumo_produccion_id - b.consumo_produccion_id;

/**
 * Consumo por producto a partir de los registros de `onboarding?op_id=`.
 *
 * El backend nunca edita el registro original: cada recálculo agrega OTRO
 * registro con cantidades firmadas (negativas cuando el consumo baja). Por eso,
 * por producto:
 * - planeado = sus renglones en el registro de menor `consumo_produccion_id`
 *   que lo contiene (no necesariamente el primero de la OP);
 * - actual = la suma de sus renglones en todos los registros;
 * - ajustes = actual − planeado.
 *
 * Un producto con varios renglones en un mismo registro los suma. El orden de
 * salida es el de primera aparición (registros por id ascendente, renglones en
 * el orden del backend). No adivina cuáles productos son tela: no hay dato
 * para saberlo.
 */
export const summarizeConsumption = (
  consumos: readonly ProductionOrderConsumo[],
): ProductConsumption[] => {
  interface Accumulator {
    producto: number;
    producto_nombre: string | null;
    records: { consumo_produccion_id: number; cantidad: ScaledQuantity }[];
  }

  const byProduct = new Map<number, Accumulator>();

  [...consumos].sort(byRecordId).forEach((consumo) => {
    consumo.detalles.forEach((detalle) => {
      let entry = byProduct.get(detalle.producto);
      if (!entry) {
        entry = { producto: detalle.producto, producto_nombre: null, records: [] };
        byProduct.set(detalle.producto, entry);
      }
      entry.producto_nombre ??= detalle.producto_nombre?.trim() || null;

      const amount = parseQuantity(detalle.cantidad);
      const last = entry.records[entry.records.length - 1];
      if (last?.consumo_produccion_id === consumo.consumo_produccion_id) {
        last.cantidad += amount;
      } else {
        entry.records.push({
          consumo_produccion_id: consumo.consumo_produccion_id,
          cantidad: amount,
        });
      }
    });
  });

  return [...byProduct.values()].map((entry) => {
    // Siempre hay al menos un registro: la entrada nace con su primer renglón.
    const planned = entry.records[0].cantidad;
    const current = entry.records.reduce((sum, record) => sum + record.cantidad, BigInt(0));
    return {
      producto: entry.producto,
      producto_nombre: entry.producto_nombre ?? productFallbackName(entry.producto),
      planned: formatScaledQuantity(planned),
      adjustments: formatScaledQuantity(current - planned),
      current: formatScaledQuantity(current),
      records: entry.records.map((record, index) => ({
        consumo_produccion_id: record.consumo_produccion_id,
        cantidad: formatScaledQuantity(record.cantidad),
        isOriginal: index === 0,
      })),
    };
  });
};

/** Registro de consumo para el historial, rotulado como original o ajuste. */
export interface LabeledConsumptionRecord {
  record: ProductionOrderConsumo;
  /** El de menor `consumo_produccion_id` de la OP; los demás son ajustes. */
  isOriginal: boolean;
}

/**
 * Registros en bruto del más antiguo al más reciente, rotulados para el
 * historial. El rótulo es de REGISTRO: el original es el primero de la OP.
 */
export const labelConsumptionRecords = (
  consumos: readonly ProductionOrderConsumo[],
): LabeledConsumptionRecord[] =>
  [...consumos].sort(byRecordId).map((record, index) => ({ record, isOriginal: index === 0 }));
