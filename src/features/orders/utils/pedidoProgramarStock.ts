import type { PedidoProgramarRenglon } from "../interfaces/pedido-programacion.interface";

/**
 * Cobertura de existencia de las tallas de "Programar pedido", calculada SOLO
 * con `GET /ventas/pedidos/{id}/programar/` (`stock_disponible` = existencia
 * en `almacen_surtido` menos reservas de otros pedidos). Mismas reglas que la
 * antigua revisión de inventario, por talla.
 *
 * Se miden únicamente las tallas con stock (`stock_disponible !== null`): las
 * de muestra y las que no tienen SKU de catálogo no tienen existencia que
 * comparar y quedan fuera de toda la cuenta.
 */

export type TallaCoverage = "full" | "partial" | "none";

/** Talla con existencia que medir (`stock_disponible` no nulo). */
type RenglonConStock = PedidoProgramarRenglon & { stock_disponible: number };

export const tieneStock = (renglon: PedidoProgramarRenglon): renglon is RenglonConStock =>
  renglon.stock_disponible !== null;

/** Cubierta si el stock alcanza, sin existencia si es 0, parcial en otro caso. */
export const getTallaCoverage = (renglon: RenglonConStock): TallaCoverage => {
  if (renglon.stock_disponible >= renglon.cantidad) return "full";
  if (renglon.stock_disponible <= 0) return "none";
  return "partial";
};

/** Existencia menos lo pedido: positiva sobra, negativa falta. */
export const getTallaDiferencia = (renglon: RenglonConStock): number =>
  renglon.stock_disponible - renglon.cantidad;

export interface ProgramarStockResumen {
  /** Piezas cubiertas / piezas pedidas, redondeado hacia abajo (99.7 → 99). */
  percent: number;
  /** Todas las piezas medidas están cubiertas (sale de la suma, no del %). */
  fullyCovered: boolean;
  tallasCubiertas: number;
  tallasMedidas: number;
  /** Suma de `faltante` del backend. */
  piezasFaltantes: number;
}

/** `null` cuando no hay ninguna talla con stock que medir. */
export const getProgramarStockResumen = (
  renglones: PedidoProgramarRenglon[],
): ProgramarStockResumen | null => {
  const medidas = renglones.filter(tieneStock);
  const requested = medidas.reduce((sum, renglon) => sum + renglon.cantidad, 0);
  if (requested <= 0) return null;
  const covered = medidas.reduce(
    (sum, renglon) => sum + Math.min(renglon.stock_disponible, renglon.cantidad),
    0,
  );
  return {
    percent: Math.floor((covered / requested) * 100),
    fullyCovered: covered === requested,
    tallasCubiertas: medidas.filter((renglon) => getTallaCoverage(renglon) === "full").length,
    tallasMedidas: medidas.length,
    piezasFaltantes: medidas.reduce((sum, renglon) => sum + (renglon.faltante ?? 0), 0),
  };
};
