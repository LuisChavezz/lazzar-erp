import { expect, test } from "@playwright/test";
import { PriceInput } from "@/src/components/PriceInput";
import { formatInCurrency } from "@/src/utils/currencyTotals";
import { formatMxn } from "@/src/utils/formatCurrency";
import {
  formatKpiCurrencyAmount,
  formatKpiSignedCurrencyAmount,
  formatKpiTaggedCurrencyAmount,
} from "@/src/utils/kpiFormat";
import { centsToMoney } from "@/src/utils/moneyCents";
import { formatMoneyOrDash } from "@/src/features/payroll/components/PayrollColumns";

/**
 * Pruebas unitarias de EC-606 sobre cómo se muestra el dinero fuera de los
 * helpers base: nómina (MXN explícito), el prefijo de `PriceInput` y los 2
 * decimales fijos de los indicadores. Sin navegador ni sesión.
 */

// Intl separa símbolo e importe con espacios no separables según la moneda.
const plain = (text: string) => text.replace(/[  ]/g, " ");

test.describe("importes de nómina en pesos", () => {
  test("centavos a pesos con formatMxn, también negativos", () => {
    expect(plain(formatMxn(centsToMoney(123450)))).toBe("$1,234.50");
    expect(plain(formatMxn(centsToMoney(-8050)))).toBe("-$80.50");
    expect(plain(formatMxn(centsToMoney(0)))).toBe("$0.00");
  });

  test("importe de la API: \"—\" si falta, está vacío o no es un decimal", () => {
    expect(plain(formatMoneyOrDash("15000.50"))).toBe("$15,000.50");
    expect(plain(formatMoneyOrDash("-80.5"))).toBe("-$80.50");
    for (const value of [null, undefined, "", "abc", "1,000.00"]) {
      expect(formatMoneyOrDash(value)).toBe("—");
    }
  });
});

test.describe("prefijo de PriceInput", () => {
  // El runner de Playwright reescribe el JSX de los `.tsx` importados, así que
  // no se puede renderizar con react-dom: se recorre el árbol de elementos que
  // devuelve el componente y se juntan los textos de sus `<span>`.
  type Node = { type?: unknown; props?: { children?: unknown } } | string | null | undefined | false;
  const spanTexts = (node: unknown): string[] => {
    if (Array.isArray(node)) return node.flatMap(spanTexts);
    if (!node || typeof node !== "object") return [];
    const { type, props } = node as Exclude<Node, string | null | undefined | false>;
    const children = props?.children;
    const own = type === "span" && typeof children === "string" ? [children] : [];
    return [...own, ...spanTexts(children)];
  };
  const prefixOf = (monedaCodigo: string | null) =>
    spanTexts(PriceInput({ value: "12.50", onChange: () => {}, monedaCodigo }));

  test("con moneda muestra su código como prefijo", () => {
    expect(prefixOf("USD")).toEqual(["USD"]);
  });

  test("sin moneda no lleva prefijo (nunca un \"$\")", () => {
    expect(prefixOf(null)).toEqual([]);
  });
});

test.describe("indicadores con 2 decimales fijos", () => {
  // El backend manda los importes con 2 decimales: una moneda cuyos decimales
  // ISO no son 2 (JPY 0, KWD 3) no se redondea ni se alarga.
  test("formatKpi* y formatInCurrency usan 2 decimales en cualquier moneda", () => {
    expect(plain(formatKpiCurrencyAmount(1234.5, "JPY"))).toBe("¥1,234.50");
    expect(plain(formatKpiSignedCurrencyAmount(-3, "KWD"))).toBe("-KWD 3.00");
    expect(plain(formatKpiTaggedCurrencyAmount(1234.5, "JPY"))).toBe("¥1,234.50");
    expect(plain(formatInCurrency(1234.5, "JPY"))).toBe("JPY 1,234.50");
    expect(plain(formatKpiCurrencyAmount("1234.5", "USD"))).toBe("$1,234.50");
  });
});
