import { expect, test } from "@playwright/test";
import {
  createCurrencyTotals,
  formatInCurrency,
  groupByCurrency,
  sumAmounts,
  sumByCurrency,
  visibleCurrencyEntries,
} from "@/src/utils/currencyTotals";
import { formatCurrencyTotalsInline } from "@/src/components/CurrencyTotalsValue";
import { currencyHasOwnSymbol, moneyFormatFor, NO_CURRENCY_FORMAT } from "@/src/utils/formatCurrency";
import { formatKpiTaggedCurrencyAmount, formatKpiTaggedSignedCurrencyAmount } from "@/src/utils/kpiFormat";
import {
  computeAgingBuckets,
  computeCxcKpis,
} from "@/src/features/accounts-receivable/utils/accounts-receivable.utils";
import type { CuentaPorCobrar } from "@/src/features/accounts-receivable/interfaces/accounts-receivable.interface";

/**
 * Pruebas unitarias de EC-601 (totales por moneda). Funciones puras: no abren
 * navegador ni necesitan login, a diferencia de los E2E de `tests/`. Corren con
 * `npm run test:unit` (`playwright.unit.config.ts`).
 */

// Los formatos de `Intl` usan espacios duros: se normalizan para comparar.
const plain = (text: string) => text.replace(/[  ]/g, " ");

const TODAY = "2026-10-27";

let nextId = 1;
const cuenta = (overrides: Partial<CuentaPorCobrar>): CuentaPorCobrar => ({
  id: nextId++,
  empresa_id: 1,
  cliente: 1,
  cliente_nombre: "Cliente",
  factura_id: nextId,
  factura_folio: null,
  moneda_id: 1,
  moneda_codigo: "MXN",
  fecha_emision: "2026-09-01",
  fecha_vencimiento: null,
  total: "0.00",
  saldo: "0.00",
  estatus: "Pendiente",
  referencia: null,
  fecha_ultimo_pago: null,
  observaciones: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  ...overrides,
});

test.describe("currencyTotals", () => {
  test("suma por moneda en centavos enteros y ordena por código, desconocida al final", () => {
    const rows = [
      { m: "USD", a: 0.1 },
      { m: null, a: 5 },
      { m: "MXN", a: 0.2 },
      { m: "USD", a: 0.2 },
      { m: "MXN", a: 1000.1 },
      { m: "EUR", a: 3 },
    ];
    expect(sumByCurrency(rows, (r) => r.m, (r) => r.a)).toEqual([
      { moneda: "EUR", total: 3 },
      { moneda: "MXN", total: 1000.3 },
      { moneda: "USD", total: 0.3 },
      { moneda: null, total: 5 },
    ]);
  });

  test("sumAmounts no arrastra el error de punto flotante", () => {
    expect(sumAmounts([0.1, 0.2])).toBe(0.3);
    expect(sumAmounts([])).toBe(0);
  });

  test("add sin importe registra la moneda con 0", () => {
    const totals = createCurrencyTotals();
    totals.add("USD");
    totals.add("MXN", 10);
    expect(totals.list()).toEqual([
      { moneda: "MXN", total: 10 },
      { moneda: "USD", total: 0 },
    ]);
  });

  test("groupByCurrency conserva el orden de los elementos dentro de cada moneda", () => {
    const groups = groupByCurrency(["b-USD", "a-MXN", "c-USD"], (s) => s.split("-")[1]);
    expect(groups).toEqual([
      { moneda: "MXN", items: ["a-MXN"] },
      { moneda: "USD", items: ["b-USD", "c-USD"] },
    ]);
  });

  test("formatInCurrency: con moneda, igual que antes; sin moneda, sin símbolo", () => {
    expect(plain(formatInCurrency(1234.5, "MXN"))).toBe("$1,234.50");
    expect(plain(formatInCurrency(1234.5, "MXN", { maximumFractionDigits: 0 }))).toBe("$1,235");
    expect(plain(formatInCurrency(1234.5, null))).toBe("1,234.50");
    expect(plain(formatInCurrency(0, null, { maximumFractionDigits: 0 }))).toBe("0");
  });

  test("formatCurrencyTotalsInline: una moneda como antes, varias con su código", () => {
    expect(plain(formatCurrencyTotalsInline([{ moneda: "MXN", total: 1500 }]))).toBe("$1,500.00");
    expect(
      plain(
        formatCurrencyTotalsInline([
          { moneda: "MXN", total: 1500 },
          { moneda: "USD", total: 20 },
        ]),
      ),
    ).toBe("$1,500.00 MXN y $20.00 USD");
    expect(plain(formatCurrencyTotalsInline([]))).toBe("0.00");
  });

  test("una moneda sin símbolo propio no repite su código junto a la etiqueta", () => {
    expect(currencyHasOwnSymbol("MXN")).toBe(true);
    expect(currencyHasOwnSymbol("USD")).toBe(true);
    expect(currencyHasOwnSymbol("XTS")).toBe(false);
    expect(currencyHasOwnSymbol("QXA")).toBe(false);
    expect(currencyHasOwnSymbol("no-es-iso")).toBe(false);
    expect(plain(formatKpiTaggedCurrencyAmount(12, "XTS"))).toBe("12.00");
    expect(plain(formatKpiTaggedCurrencyAmount(12, "USD"))).toBe("$12.00");
    expect(plain(formatKpiTaggedSignedCurrencyAmount(-3, "QXA"))).toBe("-3.00");
    expect(
      plain(
        formatCurrencyTotalsInline([
          { moneda: "MXN", total: 10 },
          { moneda: "XTS", total: 12 },
        ]),
      ),
    ).toBe("$10.00 MXN y 12.00 XTS");
  });

  test("visibleCurrencyEntries oculta las monedas en cero (en centavos) si otra tiene importe", () => {
    const amount = (e: { total: number }) => e.total;
    // Mezcla con ceros: solo quedan las que tienen importe.
    expect(
      visibleCurrencyEntries(
        [
          { moneda: "MXN", total: 118315 },
          { moneda: "USD", total: 0 },
          { moneda: "XTS", total: 0 },
        ],
        amount,
      ),
    ).toEqual([{ moneda: "MXN", total: 118315 }]);
    // Todas en cero con varias monedas: ninguna (un solo 0 sin símbolo).
    expect(visibleCurrencyEntries([{ moneda: "MXN", total: 0 }, { moneda: "USD", total: 0 }], amount)).toEqual([]);
    // Una sola moneda en cero se conserva (se ve como antes de EC-601).
    expect(visibleCurrencyEntries([{ moneda: "MXN", total: 0 }], amount)).toEqual([{ moneda: "MXN", total: 0 }]);
    // Conjunto vacío.
    expect(visibleCurrencyEntries([], amount)).toEqual([]);
    // Un importe diminuto no es cero aunque se vea "$0" sin decimales.
    expect(
      visibleCurrencyEntries([{ moneda: "MXN", total: 10 }, { moneda: "USD", total: 0.01 }], amount),
    ).toEqual([{ moneda: "MXN", total: 10 }, { moneda: "USD", total: 0.01 }]);
    // Menos de medio centavo sí cuenta como cero.
    expect(visibleCurrencyEntries([{ moneda: "MXN", total: 10 }, { moneda: "USD", total: 0.004 }], amount)).toEqual([
      { moneda: "MXN", total: 10 },
    ]);
  });

  test("formatCurrencyTotalsInline aplica la misma regla de ceros", () => {
    expect(
      plain(formatCurrencyTotalsInline([{ moneda: "MXN", total: 5 }, { moneda: "USD", total: 0 }])),
    ).toBe("$5.00");
    expect(plain(formatCurrencyTotalsInline([{ moneda: "MXN", total: 0 }, { moneda: "USD", total: 0 }]))).toBe("0.00");
    expect(plain(formatCurrencyTotalsInline([{ moneda: "MXN", total: 0 }]))).toBe("$0.00");
    expect(
      plain(formatCurrencyTotalsInline([{ moneda: "MXN", total: 10 }, { moneda: "USD", total: 0.2 }], { maximumFractionDigits: 0 })),
    ).toBe("$10 MXN y $0 USD");
  });

  test("moneyFormatFor sin overrides no cambia", () => {
    expect(moneyFormatFor("MXN")).toEqual({ currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 });
    expect(moneyFormatFor(null)).toBe(NO_CURRENCY_FORMAT);
    expect(moneyFormatFor("MXN", { maximumFractionDigits: 0 })).toEqual({
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  });
});

test.describe("computeCxcKpis por moneda", () => {
  test("no suma importes de monedas distintas y lista todas las monedas en cada KPI", () => {
    const cuentas = [
      // MXN vencida (10 días)
      cuenta({ moneda_codigo: "MXN", saldo: "1000.00", total: "1000.00", fecha_vencimiento: "2026-10-17" }),
      // MXN por vencer (5 días) con pago este mes
      cuenta({
        moneda_codigo: "MXN",
        saldo: "300.00",
        total: "500.00",
        estatus: "Parcial",
        fecha_vencimiento: "2026-11-01",
        fecha_ultimo_pago: "2026-10-05",
      }),
      // USD vencida (40 días)
      cuenta({ moneda_codigo: "USD", saldo: "50.00", total: "50.00", fecha_vencimiento: "2026-09-17" }),
      // USD pagada: no aporta montos, pero su moneda sí aparece
      cuenta({ moneda_codigo: "USD", saldo: "0.00", total: "80.00", estatus: "Pagada" }),
    ];

    const kpis = computeCxcKpis(cuentas, TODAY);

    expect(kpis.totalPorCobrar).toEqual([
      { moneda: "MXN", total: 1300 },
      { moneda: "USD", total: 50 },
    ]);
    expect(kpis.totalVencido).toEqual([
      { moneda: "MXN", total: 1000 },
      { moneda: "USD", total: 50 },
    ]);
    expect(kpis.porVencer30).toEqual([
      { moneda: "MXN", total: 300 },
      { moneda: "USD", total: 0 },
    ]);
    expect(kpis.cobradoEsteMes).toEqual([
      { moneda: "MXN", total: 200 },
      { moneda: "USD", total: 0 },
    ]);
    expect(kpis.cuentasVencidas).toBe(2);
  });

  test("con una sola moneda da una sola entrada (la vista se ve como antes)", () => {
    const kpis = computeCxcKpis(
      [cuenta({ saldo: "10.00", total: "10.00" }), cuenta({ saldo: "5.00", total: "5.00" })],
      TODAY,
    );
    expect(kpis.totalPorCobrar).toEqual([{ moneda: "MXN", total: 15 }]);
    expect(kpis.totalVencido).toEqual([{ moneda: "MXN", total: 0 }]);
  });

  test("sin cuentas no hay monedas", () => {
    const kpis = computeCxcKpis([], TODAY);
    expect(kpis.totalPorCobrar).toEqual([]);
    expect(kpis.cuentasVencidas).toBe(0);
  });
});

test.describe("computeAgingBuckets por moneda", () => {
  test("un desglose por moneda; su total coincide con el `totalVencido` de esa moneda", () => {
    const cuentas = [
      cuenta({ moneda_codigo: "USD", saldo: "50.00", fecha_vencimiento: "2026-09-17" }), // 40 días
      cuenta({ moneda_codigo: "MXN", saldo: "1000.00", fecha_vencimiento: "2026-10-17" }), // 10 días
      cuenta({ moneda_codigo: "MXN", saldo: "250.50", fecha_vencimiento: "2026-06-01" }), // 148 días
      cuenta({ moneda_codigo: "MXN", saldo: "99.00", fecha_vencimiento: "2026-11-30" }), // por vencer
    ];

    const groups = computeAgingBuckets(cuentas, TODAY);

    expect(groups.map((g) => [g.moneda, g.total])).toEqual([
      ["MXN", 1250.5],
      ["USD", 50],
    ]);
    const [mxn, usd] = groups;
    expect(mxn.buckets.map((b) => [b.key, b.count, b.amount])).toEqual([
      ["1-30", 1, 1000],
      ["31-60", 0, 0],
      ["61-90", 0, 0],
      ["90+", 1, 250.5],
    ]);
    expect(usd.buckets.map((b) => [b.key, b.count, b.amount])).toEqual([
      ["1-30", 0, 0],
      ["31-60", 1, 50],
      ["61-90", 0, 0],
      ["90+", 0, 0],
    ]);

    const vencido = computeCxcKpis(cuentas, TODAY).totalVencido;
    expect(groups.map((g) => ({ moneda: g.moneda, total: g.total }))).toEqual(vencido);
  });

  test("una moneda sin nada vencido conserva su desglose en 0", () => {
    const groups = computeAgingBuckets([cuenta({ saldo: "10.00", fecha_vencimiento: "2026-12-01" })], TODAY);
    expect(groups).toHaveLength(1);
    expect(groups[0].moneda).toBe("MXN");
    expect(groups[0].total).toBe(0);
    expect(groups[0].buckets.every((b) => b.count === 0 && b.amount === 0)).toBe(true);
  });

  test("sin cuentas no hay desgloses", () => {
    expect(computeAgingBuckets([], TODAY)).toEqual([]);
  });
});
