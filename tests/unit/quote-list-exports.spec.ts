import { expect, test } from "@playwright/test";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import type { Quote } from "@/src/features/quotes/interfaces/quote.interface";
import { buildQuotesCsv } from "@/src/features/quotes/hooks/useQuoteCsvExport";
import { compareQuoteAmounts } from "@/src/features/quotes/utils/quoteAmountSorting";
import {
  buildQuoteCurrencyFilterOptions,
  matchesQuoteCurrencyFilter,
  SIN_MONEDA_FILTER_VALUE,
} from "@/src/features/quotes/utils/quoteCurrencyFilter";

/**
 * Pruebas unitarias de EC-618 sobre las exportaciones del listado de
 * cotizaciones. Funciones puras: no abren navegador ni necesitan sesión.
 */

const quote = (overrides: Partial<Quote>): Quote =>
  ({
    id: 1,
    cliente_razon_social: "CLIENTE",
    importe_sin_iva: 0,
    moneda: null,
    moneda_codigo: null,
    ...overrides,
  }) as Quote;

const column = (id: string, header: string, accessorKey = id): DataTableVisibleColumn<Quote> => ({
  id,
  header,
  accessorKey,
});

const COLUMNS = [
  column("id", "Cotización"),
  column("importeSinIva", "Importe sin IVA", "importe_sin_iva"),
  column("cliente_razon_social", "Razón social"),
];

test.describe("CSV del listado de cotizaciones", () => {
  test("importes como número plano y una columna Moneda junto al importe", () => {
    const csv = buildQuotesCsv(
      [
        quote({ id: 239, importe_sin_iva: 1227, moneda_codigo: "USD" }),
        quote({ id: 240, importe_sin_iva: 1234567.5, moneda_codigo: "MXN" }),
        quote({ id: 235, importe_sin_iva: 0, moneda_codigo: null }),
      ],
      COLUMNS,
    );
    expect(csv.split("\n")).toEqual([
      "Cotización,Importe sin IVA,Moneda,Razón social",
      "239,1227.00,USD,CLIENTE",
      "240,1234567.50,MXN,CLIENTE",
      "235,0.00,,CLIENTE",
    ]);
  });

  test("un importe que no es número queda vacío, no en 0", () => {
    const csv = buildQuotesCsv(
      [quote({ id: 7, importe_sin_iva: Number.NaN, moneda_codigo: "MXN" })],
      COLUMNS,
    );
    expect(csv.split("\n")[1]).toBe("7,,MXN,CLIENTE");
  });

  test("sin columna de importe visible, la Moneda va al final", () => {
    const csv = buildQuotesCsv([quote({ id: 9, moneda_codigo: "USD" })], [COLUMNS[0], COLUMNS[2]]);
    expect(csv.split("\n")).toEqual(["Cotización,Razón social,Moneda", "9,CLIENTE,USD"]);
  });
});

test.describe("filtro de moneda de Mesa de Control", () => {
  test("opciones: las monedas presentes y \"Sin moneda\" solo si alguna fila no tiene", () => {
    const rows = (codes: (string | null)[]) => codes.map((moneda_codigo) => ({ moneda_codigo }));
    expect(buildQuoteCurrencyFilterOptions(rows(["USD", "MXN", "MXN"]))).toEqual([
      { value: "MXN", label: "MXN" },
      { value: "USD", label: "USD" },
    ]);
    expect(buildQuoteCurrencyFilterOptions(rows(["MXN", null]))).toEqual([
      { value: "MXN", label: "MXN" },
      { value: SIN_MONEDA_FILTER_VALUE, label: "Sin moneda" },
    ]);
  });

  test("filtra por código, y \"Sin moneda\" solo deja las filas sin moneda", () => {
    expect(matchesQuoteCurrencyFilter("USD", undefined)).toBe(true);
    expect(matchesQuoteCurrencyFilter("USD", "USD")).toBe(true);
    expect(matchesQuoteCurrencyFilter("MXN", "USD")).toBe(false);
    expect(matchesQuoteCurrencyFilter(null, SIN_MONEDA_FILTER_VALUE)).toBe(true);
    expect(matchesQuoteCurrencyFilter("MXN", SIN_MONEDA_FILTER_VALUE)).toBe(false);
  });
});

test.describe("orden por importe", () => {
  const sorted = (rows: { moneda_codigo: string | null; importe_sin_iva: number }[]) =>
    [...rows].sort(compareQuoteAmounts).map((r) => `${r.moneda_codigo ?? "-"} ${r.importe_sin_iva}`);

  test("agrupa por moneda (sin moneda al final) y ordena el importe dentro de cada una", () => {
    expect(
      sorted([
        { moneda_codigo: "USD", importe_sin_iva: 9000 },
        { moneda_codigo: null, importe_sin_iva: 5 },
        { moneda_codigo: "MXN", importe_sin_iva: 86281 },
        { moneda_codigo: "MXN", importe_sin_iva: 100 },
        { moneda_codigo: "USD", importe_sin_iva: 10 },
      ]),
    ).toEqual(["MXN 100", "MXN 86281", "USD 10", "USD 9000", "- 5"]);
  });

  test("con una sola moneda, el mismo orden numérico de siempre", () => {
    const amounts = [409, 86281, 0, 1939.5, 24912];
    const rows = amounts.map((importe_sin_iva) => ({ moneda_codigo: "MXN", importe_sin_iva }));
    expect([...rows].sort(compareQuoteAmounts).map((r) => r.importe_sin_iva)).toEqual(
      [...amounts].sort((a, b) => a - b),
    );
  });
});
