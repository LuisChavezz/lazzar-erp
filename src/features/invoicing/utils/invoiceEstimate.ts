import type { InvoiceOnboardingTalla } from "../interfaces/invoice-onboarding.interface";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { centsToMoney } from "@/src/utils/moneyCents";

export interface InvoiceEstimate {
  subtotalCentavos: number;
  impuestoCentavos: number;
  totalCentavos: number;
  /** Piezas capturadas en total. */
  piezas: number;
}

/**
 * Centavos → importe es-MX con 2 decimales en la moneda del pedido
 * (`monedaCodigo`, código ISO). El onboarding no la expone: la resuelve quien
 * llama desde el pedido elegido. Sin código, sin símbolo.
 */
export const formatCentavos = (centavos: number, monedaCodigo: string | null | undefined): string =>
  formatMoneyValue(centsToMoney(centavos), monedaCodigo ?? null);

/** Redondeo a centavo entero, mitad hacia arriba (`ROUND_HALF_UP`, como el backend). */
const roundHalfUpDiv = (numerator: number, denominator: number): number =>
  Math.floor((numerator + denominator / 2) / denominator);

/**
 * Estimación de la factura a partir de lo capturado, en CENTAVOS ENTEROS.
 *
 * Replica el cálculo del servicio de facturación renglón por renglón: subtotal
 * = piezas × precio sin IVA; impuesto = subtotal × tasa del pedido, redondeado
 * por renglón; total = subtotal + impuesto (sin descuentos: la facturación por
 * piezas no los aplica). Es solo una ESTIMACIÓN; los importes reales son los
 * que devuelve el servidor al crear la factura.
 *
 * La tasa se lleva a centésimas enteras (16 → 1600) para no multiplicar
 * decimales de punto flotante.
 */
export const estimateInvoice = (
  tallas: InvoiceOnboardingTalla[],
  quantities: Map<number, number>,
  porcentajeImpuesto: number,
): InvoiceEstimate => {
  const tasaCentesimas = Math.round(porcentajeImpuesto * 100);
  let subtotalCentavos = 0;
  let impuestoCentavos = 0;
  let piezas = 0;

  for (const talla of tallas) {
    const cantidad = quantities.get(talla.pedido_detalle_talla) ?? 0;
    if (cantidad <= 0) continue;
    const subtotal = cantidad * talla.precio_unitario_centavos;
    subtotalCentavos += subtotal;
    impuestoCentavos += roundHalfUpDiv(subtotal * tasaCentesimas, 10_000);
    piezas += cantidad;
  }

  return {
    subtotalCentavos,
    impuestoCentavos,
    totalCentavos: subtotalCentavos + impuestoCentavos,
    piezas,
  };
};
