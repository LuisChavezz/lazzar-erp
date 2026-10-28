import { expect, test } from "@playwright/test";
import {
  formatAmountNoCurrency,
  formatCurrency,
  formatMoneyValue,
  formatMoneyValueOrDash,
  formatMxn,
  type MoneyFormatOverrides,
} from "@/src/utils/formatCurrency";

/**
 * Pruebas unitarias de EC-606: los helpers de dinero exigen la moneda y no
 * tienen un MXN implícito. Funciones puras: no abren navegador ni necesitan
 * sesión.
 */

// Intl separa símbolo e importe con espacios no separables según la moneda.
const plain = (text: string) => text.replace(/[  ]/g, " ");

test.describe("helpers de dinero con moneda obligatoria", () => {
  test("con código, en esa moneda y con 2 decimales", () => {
    expect(plain(formatCurrency(1234.5, "MXN"))).toBe("$1,234.50");
    expect(plain(formatCurrency(1234.5, "USD"))).toBe("USD 1,234.50");
    expect(plain(formatMoneyValue("1234.5", "USD"))).toBe("USD 1,234.50");
    // Decimales ISO distintos de 2 (JPY) no redondean el importe.
    expect(plain(formatCurrency(1234.5, "JPY"))).toBe("JPY 1,234.50");
  });

  test("null es \"sin símbolo\", nunca pesos", () => {
    expect(plain(formatCurrency(1234.5, null))).toBe("1,234.50");
    expect(plain(formatMoneyValue("1234.5", null))).toBe("1,234.50");
    expect(plain(formatAmountNoCurrency("1234.5"))).toBe("1,234.50");
    // Un código vacío cuenta como sin moneda.
    expect(plain(formatCurrency(1234.5, ""))).toBe("1,234.50");
  });

  test("un código que Intl no reconoce se pinta sin símbolo", () => {
    expect(plain(formatCurrency(1234.5, "Peso Mexicano"))).toBe("1,234.50");
    expect(plain(formatCurrency(1234.5, "Peso Mexicano", { maximumFractionDigits: 0 }))).toBe("1,235");
  });

  test("los overrides ajustan el formato pero nunca reintroducen una moneda", () => {
    expect(plain(formatCurrency(1234.5, "MXN", { maximumFractionDigits: 0 }))).toBe("$1,235");
    expect(plain(formatCurrency(1234.5, "USD", { currencyDisplay: "code" }))).toBe("USD 1,234.50");
    expect(plain(formatCurrency(-3, null, { signDisplay: "exceptZero" }))).toBe("-3.00");
    // Un objeto de tipo más amplio es asignable a `MoneyFormatOverrides`: su
    // `currency`/`style` se descartan en tiempo de ejecución.
    // eslint-disable-next-line no-restricted-syntax -- a propósito: prueba que un MXN colado en overrides se descarta.
    const wide: Intl.NumberFormatOptions = { style: "currency", currency: "MXN" };
    expect(plain(formatCurrency(1234.5, null, wide as MoneyFormatOverrides))).toBe("1,234.50");
    expect(plain(formatCurrency(1234.5, "USD", wide as MoneyFormatOverrides))).toBe("USD 1,234.50");
  });

  test("formatMoneyValueOrDash: \"—\" si falta el valor", () => {
    expect(formatMoneyValueOrDash(null, "USD")).toBe("—");
    expect(formatMoneyValueOrDash(undefined, null)).toBe("—");
    expect(plain(formatMoneyValueOrDash("0", "USD"))).toBe("USD 0.00");
  });

  test("formatMxn: pesos explícitos, \"—\" si falta el valor", () => {
    expect(plain(formatMxn("15000.5"))).toBe("$15,000.50");
    expect(plain(formatMxn(0))).toBe("$0.00");
    expect(formatMxn(null)).toBe("—");
    expect(plain(formatMxn(1234.5, { maximumFractionDigits: 0 }))).toBe("$1,235");
  });
});
