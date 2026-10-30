import type {
  SpecialOrderLine,
  SpecialOrderTalla,
} from "../interfaces/special-order.interface";

/**
 * La talla ya pasó por un alta: tiene SKU de producción. El detalle solo lo
 * llena desde variantes ACTIVAS (ver `SpecialOrderTalla.sku_produccion`).
 */
export const isGeneratedTalla = (talla: SpecialOrderTalla): boolean =>
  Boolean(talla.sku_produccion);

/**
 * La talla la generaría un alta: tiene cantidad y aún no tiene SKU. Mismo
 * criterio que `variante-onboarding`, que es incremental.
 */
export const isPendingTalla = (talla: SpecialOrderTalla): boolean =>
  Number(talla.cantidad) > 0 && !isGeneratedTalla(talla);

/**
 * Estado del alta de SKU de la línea en la tarjeta:
 *  - `generated`: ya tiene SKU y no queda talla pendiente.
 *  - `pending`: queda alguna talla pendiente; `partial` si otras ya tienen SKU
 *    (se agregaron o ganaron cantidad DESPUÉS del alta).
 *  - `none`: sin SKU ni tallas con cantidad (el backend rechazaría el alta).
 */
export type LineSkuStatus =
  | { kind: "generated" }
  | { kind: "pending"; pendientes: SpecialOrderTalla[]; partial: boolean }
  | { kind: "none" };

export function getLineSkuStatus(line: SpecialOrderLine): LineSkuStatus {
  const pendientes = line.tallas.filter(isPendingTalla);
  const partial = line.tallas.some(isGeneratedTalla);

  if (pendientes.length > 0) return { kind: "pending", pendientes, partial };
  return partial ? { kind: "generated" } : { kind: "none" };
}
