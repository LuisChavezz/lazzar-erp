import { expect, test } from "@playwright/test";
import { formatQuoteExportTotal, getQuoteExportTotals } from "@/src/features/quotes/utils/quoteExportTotals";

/**
 * Pruebas unitarias de EC-618: total por moneda de la exportación de
 * cotizaciones (`importe_sin_iva`, reglas de EC-601 salvo el grupo sin moneda
 * en cero). Funciones puras: no abren navegador ni necesitan sesión.
 */

// Intl separa símbolo e importe con espacios no separables según la moneda.
const plain = (text: string) => text.replace(/[  ]/g, " ");

// `importe_sin_iva` es número, como lo manda la API (no texto, aunque el schema lo diga).
const row = (importe_sin_iva: number, moneda_codigo: string | null) => ({ importe_sin_iva, moneda_codigo });

test.describe("total de la exportación de cotizaciones", () => {
  test("solo MXN: un total sin código, como antes", () => {
    const quotes = [row(1000.1, "MXN"), row(200.2, "MXN")];
    expect(getQuoteExportTotals(quotes)).toEqual([{ moneda: "MXN", total: 1200.3 }]);
    expect(plain(formatQuoteExportTotal(quotes))).toBe("$1,200.30");
  });

  test("MXN y USD: nunca se suman, cada una con su código", () => {
    const quotes = [row(1000, "MXN"), row(50.25, "USD"), row(200, "MXN")];
    expect(getQuoteExportTotals(quotes)).toEqual([
      { moneda: "MXN", total: 1200 },
      { moneda: "USD", total: 50.25 },
    ]);
    expect(plain(formatQuoteExportTotal(quotes))).toBe("$1,200.00 MXN y $50.25 USD");
  });

  test("MXN y un borrador vacío sin moneda: ni código ni \"Sin moneda\"", () => {
    const quotes = [row(1000, "MXN"), row(0, null)];
    expect(getQuoteExportTotals(quotes)).toEqual([{ moneda: "MXN", total: 1000 }]);
    expect(plain(formatQuoteExportTotal(quotes))).toBe("$1,000.00");
  });

  test("MXN y un borrador con importe sin moneda: \"Sin moneda\" aparte y códigos", () => {
    const quotes = [row(1000, "MXN"), row(75.5, null)];
    expect(getQuoteExportTotals(quotes)).toEqual([
      { moneda: "MXN", total: 1000 },
      { moneda: null, total: 75.5 },
    ]);
    expect(plain(formatQuoteExportTotal(quotes))).toBe("$1,000.00 MXN y 75.50 Sin moneda");
  });

  test("moneda de prueba sin símbolo propio (XTS)", () => {
    expect(plain(formatQuoteExportTotal([row(12, "XTS")]))).toBe("XTS 12.00");
    expect(plain(formatQuoteExportTotal([row(10, "MXN"), row(12, "XTS")]))).toBe(
      "$10.00 MXN y 12.00 XTS",
    );
  });

  test("una moneda en cero se oculta, pero su presencia sigue pidiendo códigos", () => {
    // Regla de EC-601 sin cambios: la excepción solo aplica al grupo sin moneda.
    expect(plain(formatQuoteExportTotal([row(5, "MXN"), row(0, "USD")]))).toBe("$5.00 MXN");
  });

  test("sin filas: 0 sin símbolo", () => {
    expect(getQuoteExportTotals([])).toEqual([]);
    expect(plain(formatQuoteExportTotal([]))).toBe("0.00");
  });
});
