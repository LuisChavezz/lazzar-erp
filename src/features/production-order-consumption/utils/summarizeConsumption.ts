import type { ProductionOrderConsumo } from "@/src/features/production-orders/interfaces/production-order.interface";
import {
  formatScaledQuantity,
  parseQuantity,
  type ScaledQuantity,
} from "./consumptionQuantity";

/** Un registro de consumo que contiene al producto, con lo que aporta. */
export interface ProductConsumptionRecord {
  consumo_produccion_id: number;
  /**
   * Suma de los renglones del producto en ESTE registro (4 decimales, con
   * signo), o `null` si ninguno de esos renglones trajo una cantidad
   * interpretable.
   */
  cantidad: string | null;
  /** Es el registro del que sale lo planeado de este producto. */
  isOriginal: boolean;
}

/**
 * Consumo de UN producto en la OP, derivado de todos sus registros. Las
 * cantidades son `null` ("no disponible") cuando no se pueden calcular porque
 * el backend mandó un valor no interpretable: nunca se sustituyen por 0.
 */
export interface ProductConsumption {
  producto: number;
  /** Nombre del backend, o `productFallbackName(producto)` si nunca llegó. */
  producto_nombre: string;
  /** Lo del registro más antiguo (menor `consumo_produccion_id`) que lo contiene. */
  planned: string | null;
  /** `current − planned`: lo que sumaron los ajustes posteriores (con signo). */
  adjustments: string | null;
  /** Suma de sus renglones interpretables en TODOS los registros. */
  current: string | null;
  /** Registros que lo contienen, del más antiguo al más reciente. */
  records: ProductConsumptionRecord[];
}

/** Rótulo de un producto cuyo nombre el backend mandó en `null`. */
export const productFallbackName = (producto: number): string => `Producto #${producto}`;

const byRecordId = (a: ProductionOrderConsumo, b: ProductionOrderConsumo) =>
  a.consumo_produccion_id - b.consumo_produccion_id;

const formatOrNull = (value: ScaledQuantity | null): string | null =>
  value === null ? null : formatScaledQuantity(value);

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
 * Un producto con varios renglones en un mismo registro los suma. Un renglón
 * cuya cantidad no se puede interpretar queda FUERA de las sumas (y el
 * historial lo muestra como "—"); si un registro no aporta nada interpretable,
 * su cantidad es `null`, y con ella lo planeado o lo actual que dependan de él.
 * El orden de salida es el de primera aparición (registros por id ascendente,
 * renglones en el orden del backend). No adivina cuáles productos son tela: no
 * hay dato para saberlo.
 */
export const summarizeConsumption = (
  consumos: readonly ProductionOrderConsumo[],
): ProductConsumption[] => {
  interface Accumulator {
    producto: number;
    producto_nombre: string | null;
    records: { consumo_produccion_id: number; cantidad: ScaledQuantity | null }[];
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
        if (amount !== null) last.cantidad = (last.cantidad ?? BigInt(0)) + amount;
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
    const known = entry.records.flatMap((record) =>
      record.cantidad === null ? [] : [record.cantidad],
    );
    const current = known.length === 0 ? null : known.reduce((sum, value) => sum + value);
    return {
      producto: entry.producto,
      producto_nombre: entry.producto_nombre ?? productFallbackName(entry.producto),
      planned: formatOrNull(planned),
      adjustments: planned === null || current === null ? null : formatScaledQuantity(current - planned),
      current: formatOrNull(current),
      records: entry.records.map((record, index) => ({
        consumo_produccion_id: record.consumo_produccion_id,
        cantidad: formatOrNull(record.cantidad),
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
