import type { Order, PedidoDetail, PedidoDetalleLinea } from "../interfaces/order.interface";

/**
 * ¿El usuario ve los datos contables del pedido? El backend ELIMINA (no anula)
 * esos campos cuando el rol no tiene permiso contable
 * (`filtrar_campos_contabilidad_pedido`), así que basta con que uno de los
 * centinelas esté definido. No hay comprobación de rol en el cliente: la
 * frontera es lo que manda el backend.
 */
export function canSeeAccounting(pedido: Order): boolean {
  return (
    pedido.gran_total !== undefined ||
    pedido.subtotal !== undefined ||
    pedido.forma_pago !== undefined ||
    pedido.iva !== undefined
  );
}

/** Decimal del backend (`"1234.50"`, `"-3"`, `"0.125"`). */
const DECIMAL_PATTERN = /^(-?)(\d+)(?:\.(\d+))?$/;

/**
 * String decimal del backend → centavos ENTEROS, sin pasar por aritmética de
 * punto flotante (`"399.00"` → `39900`). Con más de 2 decimales redondea por el
 * tercero (mitad hacia arriba en valor absoluto). `null` si el valor falta o no
 * es un decimal válido.
 */
export function decimalToCents(value: string | null | undefined): number | null {
  if (value == null) return null;
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) return null;
  const [, sign, units, fraction = ""] = match;
  const padded = `${fraction}000`;
  let cents = Number(units) * 100 + Number(padded.slice(0, 2));
  if (Number(padded[2]) >= 5) cents += 1;
  return sign === "-" ? -cents : cents;
}

/** Centavos enteros → string decimal con 2 cifras (`39900` → `"399.00"`). */
export function centsToDecimalString(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Diferencia tolerada entre la suma de importes y el `subtotal`: 1 centavo. */
const RECONCILE_TOLERANCE_CENTS = 1;

/**
 * Precio unitario de una línea para la columna "Precio":
 * - `uniform`: todas sus tallas tienen el MISMO precio (comparado en
 *   centavos). `value` es ese precio; sin precios por talla (o sin tallas) cae
 *   al `precio_unitario` de la línea.
 * - `varies`: las tallas tienen precios distintos; `bySize` los lista para el
 *   tooltip. No ocurre en los datos actuales.
 */
export type LinePriceSummary =
  | { kind: "uniform"; value: string | null | undefined }
  | { kind: "varies"; bySize: { talla: string; precio: string | null | undefined }[] };

export function summarizeLinePrice(linea: PedidoDetalleLinea): LinePriceSummary {
  const sizeCents = new Set(linea.tallas.map((talla) => decimalToCents(talla.precio_unitario)));
  if (sizeCents.size > 1) {
    return {
      kind: "varies",
      bySize: linea.tallas.map((talla) => ({ talla: talla.talla_nombre, precio: talla.precio_unitario })),
    };
  }
  const shared = linea.tallas[0]?.precio_unitario;
  return { kind: "uniform", value: shared ?? linea.precio_unitario };
}

/**
 * Importes por línea del pedido (`Σ cantidad × precio_unitario` de sus
 * TALLAS, en centavos, indexados por id de línea), SOLO si se pueden publicar
 * sin contradecir nada.
 *
 * El backend no da el importe por línea (sus subtotales por línea y talla
 * llegan en cero), así que se calcula aquí. Devuelve `null` —y la columna
 * Importe no se muestra— cuando:
 * - falta el `subtotal` (usuario sin datos contables, o backend sin el campo);
 * - alguna talla no trae precio válido;
 * - alguna talla tiene un precio distinto al de su línea: la columna "Precio"
 *   no podría explicar el importe (Cantidad × Precio ≠ Importe);
 * - la suma de todas las líneas no concilia con el `subtotal` (tolerancia de
 *   1 centavo).
 */
export function reconciledLineAmounts(pedido: PedidoDetail): Record<number, number> | null {
  const subtotalCents = decimalToCents(pedido.subtotal);
  if (subtotalCents === null) return null;

  const amounts: Record<number, number> = {};
  let total = 0;
  for (const linea of pedido.detalles) {
    const linePriceCents = decimalToCents(linea.precio_unitario);
    let lineCents = 0;
    for (const talla of linea.tallas) {
      const priceCents = decimalToCents(talla.precio_unitario);
      if (priceCents === null || priceCents !== linePriceCents) return null;
      lineCents += talla.cantidad * priceCents;
    }
    amounts[linea.id] = lineCents;
    total += lineCents;
  }

  return Math.abs(total - subtotalCents) <= RECONCILE_TOLERANCE_CENTS ? amounts : null;
}
