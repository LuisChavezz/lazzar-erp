import type {
  QuoteDetailView,
  QuoteDetailViewDetalle,
} from "../interfaces/quote.interface";

/**
 * Qué partes del detalle de solo lectura se pueden pintar según las claves que
 * TRAE la respuesta. `GET /ventas/pedidos/{id}/cotizacion/` quita (no anula)
 * los importes y datos de pago a quien no tiene visibilidad contable; las
 * demás lecturas de cotización siempre los traen.
 *
 * Se decide por la AUSENCIA de la clave, nunca por el rol del usuario: el
 * backend es quien sabe qué puede ver cada quien. Un `null` presente es un dato
 * real (p. ej. `forma_pago` sin capturar) y no oculta nada.
 */
const has = (value: object, key: string) => Object.hasOwn(value, key);

/** Claves de la sección "Importes" (y del total del encabezado). */
const TOTALS_KEYS = ["subtotal", "iva", "anticipo", "gran_total", "monto"] as const;

/** Claves de la sección "Facturación y pagos". */
const PAYMENT_KEYS = ["forma_pago", "metodo_pago", "uso_cfdi"] as const;

/** ¿Trae los importes de la cotización? Falta una sola → la sección no se pinta. */
export const hasQuoteTotals = (quote: QuoteDetailView): boolean =>
  TOTALS_KEYS.every((key) => has(quote, key));

/** ¿Trae los datos de facturación y pago? */
export const hasQuotePaymentInfo = (quote: QuoteDetailView): boolean =>
  PAYMENT_KEYS.every((key) => has(quote, key));

/**
 * ¿Trae el precio de cada talla? Con UNA talla sin precio se ocultan las
 * columnas de precio y subtotal de todas las líneas: mostrar unas y otras no
 * daría un subtotal falso.
 */
export const hasQuoteLinePrices = (detalles: QuoteDetailViewDetalle[]): boolean =>
  detalles.every((detalle) => detalle.tallas.every((talla) => has(talla, "precio_unitario")));

/** ¿Trae el `monto` del servicio extra? Sin él se muestran nombre y cantidad. */
export const hasServicioMonto = (servicio: QuoteDetailView["servicios_extras"][number]): boolean =>
  has(servicio, "monto");
