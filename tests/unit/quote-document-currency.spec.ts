import { expect, test } from "@playwright/test";
import { QueryClient } from "@tanstack/react-query";
import type { Currency } from "@/src/features/currency/interfaces/currency.interface";
import type { QuoteById } from "@/src/features/quotes/interfaces/quote.interface";
import { createQuoteAmountFormatter } from "@/src/features/quotes/utils/quoteDetailsFormatters";
import { buildQuotePdfModel } from "@/src/features/quotes/utils/quotePdfTemplateHelpers";
import {
  CATALOGO_MONEDAS_ERROR,
  loadQuoteForDocument,
} from "@/src/features/quotes/utils/loadQuoteForDocument";

/**
 * Pruebas unitarias de EC-614: el PDF y el correo de una cotización formatean
 * sus importes como las pantallas de cotización (`formatQuoteAmount`, con el
 * código de la moneda) y, si la moneda no está en el catálogo, sin símbolo —
 * nunca en el MXN por defecto. Si el catálogo no carga, el documento se aborta.
 * Corren con `npm run test:unit`.
 */

// Los formatos de `Intl` usan espacios duros: se normalizan para comparar.
const plain = (text: string) => text.replace(/\s/g, " ");

const CURRENCIES = [
  { id: 1, codigo_iso: "MXN", nombre: "Peso mexicano" },
  { id: 7, codigo_iso: "USD", nombre: "Dólar estadounidense" },
] as Currency[];

/**
 * `loadQuoteForDocument` pide la cotización con `getQuoteById` (axios); aquí se
 * sustituye esa petición con una respuesta fija y el catálogo con la caché o
 * con un `ensureQueryData` que falla.
 */
const QUOTE_ID = 239;
const withQuote = async (moneda: number | null, run: () => Promise<void>) => {
  const { v1_api } = await import("@/src/api/v1.api");
  const originalGet = v1_api.get;
  v1_api.get = (async (url: string) => {
    if (url.includes(`/ventas/cotizaciones/${QUOTE_ID}/`)) return { data: { id: QUOTE_ID, moneda } };
    throw new Error(`GET inesperado en la prueba: ${url}`);
  }) as typeof v1_api.get;
  try {
    await run();
  } finally {
    v1_api.get = originalGet;
  }
};

const clientWithCurrencies = () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["currencies"], CURRENCIES);
  return queryClient;
};

test.describe("createQuoteAmountFormatter (correo y PDF)", () => {
  test("formatea con el código de la moneda, como las pantallas", () => {
    expect(plain(createQuoteAmountFormatter("USD")("1234.5"))).toBe("USD 1,234.50");
    expect(plain(createQuoteAmountFormatter("MXN")(1234.5))).toBe("MXN 1,234.50");
  });

  test("sin código, sin símbolo y nunca MXN", () => {
    expect(createQuoteAmountFormatter(null)("1234.5")).toBe("1,234.50");
  });

  test("guion para importes ausentes o malformados, no 0.00", () => {
    const format = createQuoteAmountFormatter("USD");
    expect(format(null)).toBe("-");
    expect(format(undefined)).toBe("-");
    expect(format("")).toBe("-");
    expect(format("1,000.00")).toBe("-");
    expect(format("abc")).toBe("-");
    expect(format(Number.NaN)).toBe("-");
  });

  test("un cero real sigue siendo cero", () => {
    expect(plain(createQuoteAmountFormatter("USD")("0.00"))).toBe("USD 0.00");
  });
});

test.describe("buildQuotePdfModel().formatMoney (PDF)", () => {
  const quote = { id: 1, detalles: [], created_at: "2026-10-28T10:00:00Z" } as unknown as QuoteById;

  test("formatea con el código de la moneda", () => {
    expect(plain(buildQuotePdfModel(quote, "USD").formatMoney(878))).toBe("USD 878.00");
    expect(plain(buildQuotePdfModel(quote, "MXN").formatMoney("878"))).toBe("MXN 878.00");
  });

  test("sin código, sin símbolo; malformado, guion", () => {
    const { formatMoney } = buildQuotePdfModel(quote, null);
    expect(formatMoney(878)).toBe("878.00");
    expect(formatMoney("n/a")).toBe("-");
  });
});

test.describe("loadQuoteForDocument", () => {
  test("resuelve el id de `moneda` contra el catálogo", async () => {
    await withQuote(7, async () => {
      const { quote, monedaCodigo } = await loadQuoteForDocument(clientWithCurrencies(), QUOTE_ID);
      expect(quote.id).toBe(QUOTE_ID);
      expect(monedaCodigo).toBe("USD");
    });
  });

  test("catálogo cargado sin esa moneda (o sin moneda): null, sin símbolo", async () => {
    await withQuote(99, async () => {
      expect((await loadQuoteForDocument(clientWithCurrencies(), QUOTE_ID)).monedaCodigo).toBeNull();
    });
    await withQuote(null, async () => {
      expect((await loadQuoteForDocument(clientWithCurrencies(), QUOTE_ID)).monedaCodigo).toBeNull();
    });
  });

  test("si el catálogo no carga, aborta con un error para el usuario", async () => {
    const network = new Error("network");
    let options: { retry?: unknown } | undefined;
    const failing = {
      ensureQueryData: (opts: { retry?: unknown }) => {
        options = opts;
        return Promise.reject(network);
      },
    } as unknown as QueryClient;

    await withQuote(7, async () => {
      const error = await loadQuoteForDocument(failing, QUOTE_ID).then(
        () => null,
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(CATALOGO_MONEDAS_ERROR);
      expect((error as Error).cause).toBe(network);
    });
    // El catálogo se reintenta antes de abortar.
    expect(options?.retry).toBeGreaterThan(0);
  });
});
