import { expect, test } from "@playwright/test";
import { QueryClient } from "@tanstack/react-query";
import type { Currency } from "@/src/features/currency/interfaces/currency.interface";
import type { QuoteById } from "@/src/features/quotes/interfaces/quote.interface";
import { toCurrencyOrDash } from "@/src/features/quotes/utils/quoteDetailsFormatters";
import { buildQuotePdfModel } from "@/src/features/quotes/utils/quotePdfTemplateHelpers";
import { resolveQuoteMonedaCodigo } from "@/src/features/quotes/utils/resolveQuoteMonedaCodigo";

/**
 * Pruebas unitarias de EC-614: el PDF y el correo de una cotización formatean
 * sus importes en la moneda de la cotización y, si no se resuelve, sin
 * símbolo — nunca en el MXN por defecto de `formatCurrency`. Corren con
 * `npm run test:unit`.
 */

// Los formatos de `Intl` usan espacios duros: se normalizan para comparar.
const plain = (text: string) => text.replace(/\s/g, " ");

const CURRENCIES = [
  { id: 1, codigo_iso: "MXN", nombre: "Peso mexicano" },
  { id: 2, codigo_iso: "USD", nombre: "Dólar estadounidense" },
] as Currency[];

const clientWithCurrencies = () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["currencies"], CURRENCIES);
  return queryClient;
};

test.describe("toCurrencyOrDash (correo)", () => {
  test("formatea en la moneda indicada", () => {
    expect(plain(toCurrencyOrDash("1234.5", "USD"))).toBe("USD 1,234.50");
    expect(plain(toCurrencyOrDash(1234.5, "MXN"))).toBe("$1,234.50");
  });

  test("sin código, sin símbolo y con 2 decimales", () => {
    expect(toCurrencyOrDash("1234.5", null)).toBe("1,234.50");
  });

  test("conserva el guion para importes ausentes", () => {
    expect(toCurrencyOrDash(null, "USD")).toBe("-");
    expect(toCurrencyOrDash(undefined, "USD")).toBe("-");
    expect(toCurrencyOrDash("", "USD")).toBe("-");
  });
});

test.describe("buildQuotePdfModel().formatMoney (PDF)", () => {
  const quote = { id: 1, detalles: [], created_at: "2026-10-28T10:00:00Z" } as unknown as QuoteById;

  test("formatea en la moneda indicada", () => {
    expect(plain(buildQuotePdfModel(quote, "USD").formatMoney(878))).toBe("USD 878.00");
    expect(plain(buildQuotePdfModel(quote, "MXN").formatMoney(878))).toBe("$878.00");
  });

  test("sin código, sin símbolo", () => {
    expect(buildQuotePdfModel(quote, null).formatMoney(878)).toBe("878.00");
  });
});

test.describe("resolveQuoteMonedaCodigo", () => {
  test("resuelve el id de `moneda` contra el catálogo", async () => {
    const queryClient = clientWithCurrencies();
    expect(await resolveQuoteMonedaCodigo(queryClient, { moneda: 2 })).toBe("USD");
    expect(await resolveQuoteMonedaCodigo(queryClient, { moneda: 1 })).toBe("MXN");
  });

  test("devuelve null si la moneda falta o no está en el catálogo", async () => {
    const queryClient = clientWithCurrencies();
    expect(await resolveQuoteMonedaCodigo(queryClient, { moneda: 99 })).toBeNull();
    expect(
      await resolveQuoteMonedaCodigo(queryClient, { moneda: null as unknown as number }),
    ).toBeNull();
  });

  test("devuelve null si el catálogo no carga", async () => {
    const failing = {
      ensureQueryData: () => Promise.reject(new Error("network")),
    } as unknown as QueryClient;
    expect(await resolveQuoteMonedaCodigo(failing, { moneda: 2 })).toBeNull();
  });
});
