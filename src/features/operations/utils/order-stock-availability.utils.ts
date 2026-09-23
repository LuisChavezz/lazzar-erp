import type {
  OrderStockDetail,
  OrderStockDetailSize,
} from "@/src/features/orders/interfaces/order-stock-detail.interface";
import type {
  LineCoverage,
  NormalizedOrderStockDetail,
  SizeCoverage,
} from "../types/order-stock-review.types";

// Mapa de estilos visuales por estado de cobertura.
// Cubre bordes y fondos de tarjeta, filas de tabla, badge de estado, etiqueta e ícono.
export const coverageStyles: Record<
  LineCoverage,
  {
    card: string;
    row: string;
    badge: string;
    label: string;
    iconClass: string;
  }
> = {
  full: {
    card: "border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-900/10",
    row: "bg-emerald-50/40 dark:bg-emerald-900/10",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    label: "Cubierto",
    iconClass: "text-emerald-500",
  },
  partial: {
    card: "border-amber-200/70 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-900/10",
    row: "bg-amber-50/40 dark:bg-amber-900/10",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    label: "Parcial",
    iconClass: "text-amber-500",
  },
  none: {
    card: "border-rose-200/70 bg-rose-50/40 dark:border-rose-500/20 dark:bg-rose-900/10",
    row: "bg-rose-50/40 dark:bg-rose-900/10",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    label: "Sin existencia",
    iconClass: "text-rose-500",
  },
  "no-sizes": {
    card: "border-slate-200 bg-slate-50/60 dark:border-white/10 dark:bg-white/5",
    row: "",
    badge: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
    label: "Sin tallas registradas",
    iconClass: "text-slate-400",
  },
};

// La existencia puede llegar negativa; para cubrir cuenta como cero.
const coveredStock = (stockSize: OrderStockDetailSize) =>
  Math.max(stockSize.stock_actual, 0);

// Cobertura de una talla: existencia contra cantidad pedida.
export function getSizeCoverage(stockSize: OrderStockDetailSize): SizeCoverage {
  if (stockSize.stock_actual >= stockSize.cantidad_pedida) return "full";
  if (stockSize.stock_actual <= 0) return "none";
  return "partial";
}

// Cobertura de una línea a partir de sus tallas: full si todas cubiertas, none
// si ninguna tiene existencia, partial en otro caso. Sin tallas → `no-sizes`
// (sin esto, `every` sobre un arreglo vacío la daría por cubierta).
export function getLineCoverage(stockDetail: OrderStockDetail): LineCoverage {
  if (stockDetail.tallas.length === 0) return "no-sizes";

  const sizeCoverages = stockDetail.tallas.map(getSizeCoverage);
  if (sizeCoverages.every((coverage) => coverage === "full")) return "full";
  if (sizeCoverages.every((coverage) => coverage === "none")) return "none";
  return "partial";
}

// Unidades faltantes de una línea (0 si está cubierta o no tiene tallas).
export function getLineMissingUnits(stockDetail: OrderStockDetail): number {
  return stockDetail.tallas.reduce(
    (sum, stockSize) =>
      sum + Math.max(stockSize.cantidad_pedida - coveredStock(stockSize), 0),
    0
  );
}

/**
 * Cobertura global: suma de min(existencia, pedido) por talla sobre el total
 * pedido. Las líneas sin tallas no aportan nada a ninguno de los dos lados.
 * Devuelve `null` cuando no hay ninguna talla que medir.
 *
 * `percent` usa `Math.floor` para no mostrar 100 % con faltantes (99.75 →
 * 99). El estado "todo cubierto" sale de `covered === requested`, no del %:
 * con valores normalizados, cada talla cubierta aporta exactamente su
 * `cantidad_pedida` (entera), así que la igualdad es exacta.
 */
export function getGlobalCoverage(
  stockDetails: OrderStockDetail[]
): { percent: number; fullyCovered: boolean } | null {
  let requested = 0;
  let covered = 0;
  for (const stockDetail of stockDetails) {
    for (const stockSize of stockDetail.tallas) {
      requested += stockSize.cantidad_pedida;
      covered += Math.min(coveredStock(stockSize), stockSize.cantidad_pedida);
    }
  }
  if (requested <= 0) return null;
  return {
    percent: Math.floor((covered / requested) * 100),
    fullyCovered: covered === requested,
  };
}

// Redondea a 2 decimales y convierte `-0` en `0`.
const roundQuantity = (value: number): number => {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
};

/**
 * Normaliza la respuesta UNA vez: `stock_actual` a 2 decimales y `diferencia`
 * recalculada a partir de él (así signo, color, estado y cobertura leen los
 * mismos números que se muestran; -0.002 pasa a 0 neutro, no a "-0" en rojo).
 * También agrega la clave estable de cada línea: producto + color + índice.
 */
export function normalizeStockDetails(
  stockDetails: OrderStockDetail[]
): NormalizedOrderStockDetail[] {
  return stockDetails.map((stockDetail, index) => ({
    ...stockDetail,
    key: `${stockDetail.producto}-${stockDetail.color}-${index}`,
    tallas: stockDetail.tallas.map((stockSize) => {
      const stockActual = roundQuantity(stockSize.stock_actual);
      return {
        ...stockSize,
        stock_actual: stockActual,
        diferencia: roundQuantity(stockActual - stockSize.cantidad_pedida),
      };
    }),
  }));
}
