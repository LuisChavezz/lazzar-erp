import { expect, test } from "@playwright/test";
import {
  hasQuoteLinePrices,
  hasQuotePaymentInfo,
  hasQuoteTotals,
  hasServicioMonto,
  quoteLineSubtotal,
  quoteTallaSubtotal,
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

test.describe("quoteTallaSubtotal / quoteLineSubtotal", () => {
  test("precio presente: precio × cantidad", () => {
    expect(quoteTallaSubtotal({ precio_unitario: "10.50", cantidad: 3 })).toBe(31.5);
    expect(
      quoteLineSubtotal(detalle([{ precio_unitario: "10", cantidad: 2 }, { precio_unitario: "5", cantidad: 1 }])),
    ).toBe(25);
  });

  test("precio null, ausente o no numérico: sin subtotal, nunca un 0 calculado", () => {
    expect(quoteTallaSubtotal({ precio_unitario: null, cantidad: 5 })).toBeNull();
    expect(quoteTallaSubtotal({ cantidad: 5 })).toBeNull();
    expect(quoteTallaSubtotal({ precio_unitario: "abc", cantidad: 5 })).toBeNull();
    expect(
      quoteLineSubtotal(detalle([{ precio_unitario: "10", cantidad: 2 }, { precio_unitario: null, cantidad: 5 }])),
    ).toBeNull();
  });

  test("precio en cero sí es un subtotal (0 real)", () => {
    expect(quoteTallaSubtotal({ precio_unitario: "0.00", cantidad: 4 })).toBe(0);
  });
});
