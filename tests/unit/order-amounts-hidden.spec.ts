import { expect, test } from "@playwright/test";
import type { ReactNode } from "react";
import type { KpiCompactItem, KpiItem } from "@/src/components/KpiGrid";
import { formatKpiCurrencyBlockValue } from "@/src/components/KpiCurrency";
import { buildResumenKpiItems } from "@/src/features/customers/components/CustomerResumenKpis";
import { formatResumenPedidoTotal } from "@/src/features/customers/components/CustomerResumenPedidos";
import type { ResumenComercial, ResumenComercialPedido } from "@/src/features/customers/interfaces/customer.interface";
import { HIDDEN_PEDIDO_AMOUNTS_REASON } from "@/src/features/orders/constants/pedidoKpis";
import {
  formatDrillDownTotal,
  getDescription,
} from "@/src/features/orders/components/PedidoKpiDrillDownDialog";
import { buildCards } from "@/src/features/orders/components/PedidoKpisSection";
import type {
  PedidoActiveKpiAvailable,
  PedidoKpiActiveOrder,
  PedidoKpis,
} from "@/src/features/orders/interfaces/pedido-kpis.interface";
import * as compras from "@/src/features/purchase-orders/utils/purchaseOrderKpis";
import { canSeeKpiAmounts, HIDDEN_KPI_AMOUNT_TEXT } from "@/src/utils/kpiAmounts";

/**
 * Pruebas unitarias de EC-788: importes de pedidos que el backend OMITE por
 * permiso (EC-784) en "Mis pedidos" (`GET /ventas/pedidos/kpis/`) y en el
 * resumen comercial del cliente (`GET /terceros/clientes/{id}/`). Sin permiso
 * las claves no vienen (no son `null` ni 0) y la bandera `puede_ver_importes`
 * dice si se ven; solo un `true` explícito los muestra. Las respuestas imitan
 * las del backend (`ventas/api/views.py`, `terceros/api/views.py`).
 */

// Intl separa símbolo e importe con espacios no separables según la moneda.
const plain = (text: string) => text.replace(/[  ]/g, " ");

/** El texto de un `KpiMutedValue`/`MutedValue` (el runner no da `isValidElement`). */
const childText = (value: ReactNode): string | null => {
  if (typeof value === "object" && value !== null && "props" in value) {
    const children = (value.props as { children?: unknown }).children;
    return typeof children === "string" ? children : null;
  }
  return null;
};

type Flag = true | false | "missing";
const FLAGS: Flag[] = [true, false, "missing"];
const withFlag = <T extends object>(base: T, flag: Flag): T & { puede_ver_importes?: boolean } =>
  flag === "missing" ? base : { ...base, puede_ver_importes: flag };

test.describe("canSeeKpiAmounts (src/utils/kpiAmounts)", () => {
  test("solo un true explícito muestra importes", () => {
    expect(canSeeKpiAmounts(true)).toBe(true);
    expect(canSeeKpiAmounts(false)).toBe(false);
    expect(canSeeKpiAmounts(undefined)).toBe(false);
  });

  test("purchase-orders reexporta los mismos helpers", () => {
    expect(compras.canSeeKpiAmounts).toBe(canSeeKpiAmounts);
    expect(compras.HIDDEN_KPI_AMOUNT_TEXT).toBe(HIDDEN_KPI_AMOUNT_TEXT);
  });
});

test.describe("KpiCurrencyBlocks", () => {
  test("un monto ausente es \"—\", no \"$0.00\"; uno presente se formatea igual que antes", () => {
    expect(formatKpiCurrencyBlockValue({ moneda: "MXN" })).toBe("—");
    expect(plain(formatKpiCurrencyBlockValue({ moneda: "MXN", monto: 1379122.26 }))).toBe("$1,379,122.26");
    expect(plain(formatKpiCurrencyBlockValue({ moneda: "MXN", monto: 0 }))).toBe("$0.00");
  });
});

// ── GET /ventas/pedidos/kpis/ ──────────────────────────────────────────────
const order = (id: number, granTotal?: number): PedidoKpiActiveOrder => ({
  id,
  folio: `P-${String(id).padStart(5, "0")}-2026`,
  estatus: 3,
  estatus_label: "AUTORIZADA",
  ...(granTotal === undefined ? {} : { gran_total: granTotal }),
  cliente_nombre: "Luis Ceja",
  moneda: "MXN",
});

/** Pedidos activos como los manda el backend: sin permiso no vienen `valor` ni `gran_total`. */
const activos = (withAmounts: boolean, overrides: Partial<PedidoActiveKpiAvailable> = {}): PedidoActiveKpiAvailable => ({
  disponible: true,
  total: 39,
  por_moneda: [
    { moneda: "MXN", total: 37, ...(withAmounts ? { valor: 1379122.26 } : {}) },
    { moneda: "USD", total: 2, ...(withAmounts ? { valor: 6411.32 } : {}) },
  ],
  drill_down: withAmounts ? [order(21, 728468.4), order(33, 138469.2)] : [order(150), order(149)],
  drill_down_total: 39,
  drill_down_truncado: true,
  ...overrides,
});

const NO_DISPONIBLE = { disponible: false as const, motivo: "No disponible." };
const kpis = (flag: Flag, pedidosActivos: PedidoActiveKpiAvailable): PedidoKpis =>
  withFlag(
    {
      generado_en: "2026-11-06T18:00:00Z",
      pedidos_activos: pedidosActivos,
      otif: NO_DISPONIBLE,
      lead_time_promedio: NO_DISPONIBLE,
      pedidos_en_riesgo: NO_DISPONIBLE,
    },
    flag,
  ) as PedidoKpis;

const activeCardOf = (data: PedidoKpis): KpiCompactItem => {
  const card = buildCards(data, () => {}).find((c) => c.label === "Pedidos activos");
  if (!card) throw new Error("Sin tarjeta Pedidos activos");
  return card;
};

test.describe("Mis pedidos: tarjeta Pedidos activos", () => {
  for (const flag of FLAGS) {
    const visible = flag === true;
    test(`bandera ${String(flag)}: ${visible ? "importes por moneda" : "\"No visible\" con el conteo"}`, () => {
      const card = activeCardOf(kpis(flag, activos(visible)));
      expect(card.detail).toBe("39 pedidos activos");
      if (visible) {
        expect(childText(card.value)).toBeNull();
        expect(card.info).toContain("el valor es la suma de sus totales");
      } else {
        expect(childText(card.value)).toBe(HIDDEN_KPI_AMOUNT_TEXT);
        expect(card.info).toContain(HIDDEN_PEDIDO_AMOUNTS_REASON);
        expect(card.info).not.toContain("totales");
      }
    });
  }

  test("una bandera ausente oculta los importes aunque la respuesta los traiga", () => {
    const card = activeCardOf(kpis("missing", activos(true)));
    expect(childText(card.value)).toBe(HIDDEN_KPI_AMOUNT_TEXT);
  });

  test("sin pedidos activos, el ⓘ solo habla de totales con permiso", () => {
    const vacio = { total: 0, por_moneda: [], drill_down: [], drill_down_total: 0, drill_down_truncado: false };
    const sinPermiso = activeCardOf(kpis(false, activos(false, vacio)));
    expect(childText(sinPermiso.value)).toBe("Sin pedidos activos");
    expect(sinPermiso.info).not.toContain("totales");
    expect(sinPermiso.info).toContain(HIDDEN_PEDIDO_AMOUNTS_REASON);
    const conPermiso = activeCardOf(kpis(true, activos(true, vacio)));
    expect(conPermiso.info).toContain("el valor es la suma de sus totales");
  });
});

test.describe("Mis pedidos: drill-down", () => {
  test("con importes en las filas: ordenados por total (como antes)", () => {
    expect(getDescription(activos(true))).toBe(
      "Mostrando 2 de 39 pedidos activos, ordenados por total sin convertir monedas",
    );
  });

  test("sin importes en las filas: los más recientes", () => {
    expect(getDescription(activos(false))).toBe("Mostrando los 2 más recientes de 39 pedidos activos");
  });

  test("sin corte la descripción no habla de orden", () => {
    expect(getDescription(activos(false, { drill_down_truncado: false }))).toBe("Mostrando 2 de 39 pedidos activos");
  });

  test("el total es \"—\" sin permiso o sin monto, nunca \"$0.00\"", () => {
    expect(plain(formatDrillDownTotal(order(21, 728468.4), true))).toBe("$728,468.40");
    expect(formatDrillDownTotal(order(21, 728468.4), false)).toBe("—");
    expect(formatDrillDownTotal(order(150), true)).toBe("—");
    expect(formatDrillDownTotal(order(150), false)).toBe("—");
  });
});

// ── GET /terceros/clientes/{id}/ → resumen_comercial ───────────────────────
const recentOrder = (withAmount: boolean): ResumenComercialPedido => ({
  id: 147,
  folio: "P-00147-2026",
  fecha: "2026-11-05T17:12:44.512000-06:00",
  estatus: 3,
  estatus_display: "AUTORIZADA",
  ...(withAmount ? { gran_total: 948.88 } : {}),
  moneda: "MXN",
});

const resumen = (flag: Flag, withAmounts: boolean): ResumenComercial => {
  const ultimo = recentOrder(withAmounts);
  return withFlag(
    {
      total_pedidos: 6,
      total_cotizaciones: 9,
      pedidos_por_estatus: { AUTORIZADA: 6 },
      ...(withAmounts
        ? { montos_por_moneda: [{ moneda: "MXN", total: 9711.52 }, { moneda: "USD", total: 1018.48 }] }
        : {}),
      ultimo_pedido: ultimo,
      pedidos_recientes: [ultimo],
      cartera: [],
    },
    flag,
  ) as ResumenComercial;
};

const amountCardOf = (data: ResumenComercial): KpiItem => {
  const card = buildResumenKpiItems(data).find((c) => c.label === "Monto en pedidos");
  if (!card) throw new Error("Sin tarjeta Monto en pedidos");
  return card;
};

test.describe("Detalle de cliente: resumen comercial", () => {
  for (const flag of FLAGS) {
    const visible = flag === true;
    test(`bandera ${String(flag)}: tarjeta de monto ${visible ? "con importes" : "\"No visible\""}, sin romper`, () => {
      const card = amountCardOf(resumen(flag, visible));
      if (visible) {
        expect(card.subLabel).toBe("Sin pedidos cancelados");
        expect(Array.isArray(card.value)).toBe(true);
        expect(card.iconClass).toBe("text-emerald-500");
      } else {
        expect(card.subLabel).toBe(HIDDEN_PEDIDO_AMOUNTS_REASON);
        expect(childText(card.value)).toBe(HIDDEN_KPI_AMOUNT_TEXT);
        expect(card.iconClass).toBe("text-slate-400");
      }
    });
  }

  test("con permiso pero sin montos_por_moneda cae en el estado vacío, sin TypeError", () => {
    const card = amountCardOf(resumen(true, false));
    expect(childText(card.value)).toBe("Sin montos registrados");
  });

  test("el total de un pedido reciente es \"—\" sin permiso o sin monto, nunca \"$0.00\"", () => {
    expect(plain(formatResumenPedidoTotal(recentOrder(true), true))).toBe("$948.88");
    expect(formatResumenPedidoTotal(recentOrder(true), false)).toBe("—");
    expect(formatResumenPedidoTotal(recentOrder(false), true)).toBe("—");
    expect(formatResumenPedidoTotal(recentOrder(false), false)).toBe("—");
  });
});
