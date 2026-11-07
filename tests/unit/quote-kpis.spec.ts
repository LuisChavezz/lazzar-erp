import { expect, test } from "@playwright/test";
import type { QuoteKpis } from "@/src/features/quotes/interfaces/quote-list.interface";
import {
  getPendingAuthorizationCount,
  getQuoteAmountsExcludingRejected,
} from "@/src/features/quotes/utils/quoteKpis";

/**
 * Lecturas de `GET /ventas/cotizaciones/kpis/` para las tarjetas (EC-809): el
 * importe por moneda excluye las rechazadas (estatus 4) y nunca mezcla monedas.
 */

const kpis: QuoteKpis = {
  generado_en: "2026-11-07T12:00:00Z",
  total: 9,
  por_moneda: [],
  por_estatus: [
    {
      estatus: 1,
      estatus_label: "BORRADOR",
      total: 3,
      por_moneda: [
        { moneda: "MXN", total: 2, gran_total: "100.10" },
        { moneda: null, total: 1, gran_total: "5.00" },
      ],
    },
    {
      estatus: 2,
      estatus_label: "EN REVISION",
      total: 2,
      por_moneda: [
        { moneda: "MXN", total: 1, gran_total: "0.20" },
        { moneda: "USD", total: 1, gran_total: "10.00" },
      ],
    },
    { estatus: 3, estatus_label: "AUTORIZADA", total: 0, por_moneda: [] },
    {
      estatus: 4,
      estatus_label: "RECHAZADA",
      total: 3,
      por_moneda: [{ moneda: "MXN", total: 3, gran_total: "999.00" }],
    },
    { estatus: 5, estatus_label: "CAMBIOS SOLICITADOS", total: 0, por_moneda: [] },
  ],
};

test("por autorizar es el conteo del estatus 2", () => {
  expect(getPendingAuthorizationCount(kpis)).toBe(2);
});

test("importe por moneda sin las rechazadas, en centavos y con sin moneda al final", () => {
  expect(getQuoteAmountsExcludingRejected(kpis)).toEqual([
    { moneda: "MXN", monto: 100.3, cotizaciones: 3 },
    { moneda: "USD", monto: 10, cotizaciones: 1 },
    { moneda: null, monto: 5, cotizaciones: 1 },
  ]);
});

test("sin cotizaciones no hay monedas", () => {
  expect(
    getQuoteAmountsExcludingRejected({ ...kpis, por_estatus: kpis.por_estatus.map((b) => ({ ...b, por_moneda: [] })) }),
  ).toEqual([]);
});
