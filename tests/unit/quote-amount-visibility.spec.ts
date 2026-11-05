import { expect, test } from "@playwright/test";
import {
  hasQuoteLinePrices,
  hasQuotePaymentInfo,
  hasQuoteTotals,
  hasServicioMonto,
} from "@/src/features/quotes/utils/quoteAmountVisibility";
import type {
  QuoteDetailView,
  QuoteDetailViewDetalle,
} from "@/src/features/quotes/interfaces/quote.interface";

/**
 * EC-792: `GET /ventas/pedidos/{id}/cotizacion/` QUITA los importes y los datos
 * de pago a quien no tiene visibilidad contable. El detalle decide qué pintar
 * por la AUSENCIA de la clave, nunca por un valor vacío ni por el rol.
 * Corren con `npm run test:unit`.
 */

// Solo las claves que miran los helpers; el resto de la forma no importa aquí.
const quote = (fields: Record<string, unknown>) => fields as unknown as QuoteDetailView;
const detalle = (tallas: Record<string, unknown>[]) =>
  ({ tallas }) as unknown as QuoteDetailViewDetalle;

const FULL_ROOT = {
  subtotal: "100.00",
  iva: 16,
  anticipo: "0.00",
  gran_total: "116.00",
  monto: null,
  forma_pago: null,
  metodo_pago: "PUE",
  uso_cfdi: "G03",
};

test.describe("hasQuoteTotals / hasQuotePaymentInfo", () => {
  test("respuesta completa: se pintan importes y pagos, aunque haya nulls reales", () => {
    expect(hasQuoteTotals(quote(FULL_ROOT))).toBe(true);
    expect(hasQuotePaymentInfo(quote(FULL_ROOT))).toBe(true);
  });

  test("respuesta enmascarada (sin las claves): se ocultan ambas secciones", () => {
    expect(hasQuoteTotals(quote({}))).toBe(false);
    expect(hasQuotePaymentInfo(quote({}))).toBe(false);
  });

  test("una sola clave ausente basta para ocultar la sección", () => {
    const without = (key: keyof typeof FULL_ROOT) =>
      Object.fromEntries(Object.entries(FULL_ROOT).filter(([k]) => k !== key));
    expect(hasQuoteTotals(quote(without("gran_total")))).toBe(false);
    expect(hasQuotePaymentInfo(quote(without("uso_cfdi")))).toBe(false);
  });

  test("un importe en cero sigue siendo un importe", () => {
    expect(hasQuoteTotals(quote({ ...FULL_ROOT, gran_total: "0.00", subtotal: 0 }))).toBe(true);
  });
});

test.describe("hasQuoteLinePrices", () => {
  test("todas las tallas con precio → columnas visibles", () => {
    expect(
      hasQuoteLinePrices([detalle([{ precio_unitario: "10.00" }, { precio_unitario: null }])]),
    ).toBe(true);
  });

  test("alguna talla sin la clave → columnas ocultas en todas las líneas", () => {
    expect(
      hasQuoteLinePrices([
        detalle([{ precio_unitario: "10.00" }]),
        detalle([{ cantidad: 3 }]),
      ]),
    ).toBe(false);
  });

  test("sin líneas no hay nada que ocultar", () => {
    expect(hasQuoteLinePrices([])).toBe(true);
  });
});

test.describe("hasServicioMonto", () => {
  type Servicio = QuoteDetailView["servicios_extras"][number];
  test("distingue clave ausente de monto en cero", () => {
    expect(hasServicioMonto({ nombre: "Envío", monto: "0.00" } as unknown as Servicio)).toBe(true);
    expect(hasServicioMonto({ nombre: "Envío", cantidad: 1 } as unknown as Servicio)).toBe(false);
  });
});
