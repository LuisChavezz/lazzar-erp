import { expect, test } from "@playwright/test";
import type { ReactNode } from "react";
import type { KpiCompactItem } from "@/src/components/KpiGrid";
import {
  isPurchaseOrderKpisSinEmpresa,
  isPurchaseOrderReceiptKpisSinEmpresa,
  isSupplierKpisSinEmpresa,
} from "@/src/features/purchase-orders/utils/kpiSinEmpresa";
import { buildCards as buildPurchaseOrderCards } from "@/src/features/purchase-orders/components/PurchaseOrderKpisSection";
import { buildCards as buildReceiptCards } from "@/src/features/purchase-order-receipts/components/PurchaseOrderReceiptKpisSection";
import { buildCards as buildSupplierCards } from "@/src/features/suppliers/components/SupplierKpisSection";
import type { PurchaseOrderKpis } from "@/src/features/purchase-orders/interfaces/purchase-order-kpis.interface";
import type { PurchaseOrderReceiptKpis } from "@/src/features/purchase-order-receipts/interfaces/purchase-order-receipt-kpis.interface";
import type { SupplierKpis } from "@/src/features/suppliers/interfaces/supplier-kpis.interface";

/**
 * Pruebas unitarias de EC-718: cada respuesta de KPIs de Compras dice "sin
 * empresa" a su manera (`kpiSinEmpresa.ts`), y las tarjetas de solo importe
 * muestran "No disponible" (motivo del bloque) sin empresa y "No visible" sin
 * permiso. Las respuestas imitan las del backend (`compras/api/views.py`,
 * `terceros/api/views.py`), con valores reales de una verificación en vivo.
 */
const SIN_EMPRESA = { disponible: false as const, motivo: "Usuario sin empresa asignada." };
const SIN_PERMISO = { disponible: false as const, motivo: "Sin permiso de contabilidad." };
const noop = () => {};

/**
 * Lo que la tarjeta muestra como valor: `KpiGrid` pinta "No disponible" con
 * `unavailableReason`, y "No visible" llega como el texto de `KpiMutedValue`.
 * El runner transforma el JSX con su propio runtime, así que el elemento se lee
 * por su forma (`props.children`) y no con `isValidElement`.
 */
const shown = (card: KpiCompactItem): string => {
  if (card.unavailableReason !== undefined) return "No disponible";
  const value: ReactNode = card.value;
  if (typeof value === "object" && value !== null && "props" in value) {
    const children = (value.props as { children?: unknown }).children;
    if (typeof children === "string") return children;
    return "(elemento)";
  }
  return String(value);
};
const cardByLabel = (cards: KpiCompactItem[], label: string) => {
  const card = cards.find((c) => c.label === label);
  if (!card) throw new Error(`Sin tarjeta ${label}`);
  return card;
};

// ── ordenes/kpis/ ──────────────────────────────────────────────────────────
const ocConEmpresa = (puede: boolean): PurchaseOrderKpis => ({
  generado_en: "2026-11-02T22:14:09Z",
  ocs_abiertas: {
    disponible: true,
    total: 17,
    por_moneda: [{ moneda: "MXN", total: 16, ...(puede ? { monto: 31430.06 } : {}) }],
    por_estatus: [{ estatus: 2, estatus_label: "Pendiente a confirmar", moneda: "MXN", total: 6 }],
  },
  ocs_vencidas_sin_recibir: { disponible: true, total: 0, drill_down: [] },
  ciclo_compra: { disponible: false, motivo: "El flujo Requisición → Solicitud de compra → OC no se usa hoy." },
  gasto_por_categoria: puede
    ? { disponible: true, categorias: [{ categoria: "TELAS", moneda: "MXN", monto: 87514.81 }] }
    : SIN_PERMISO,
  ocs_por_grupo: {
    disponible: true,
    activas: 17,
    por_autorizar: 6,
    autorizadas_o_completadas: 11,
    en_curso: 2,
    recibidas: 1,
    canceladas: 3,
  },
  valor_ocs_activas: {
    disponible: true,
    total: 17,
    por_moneda: [{ moneda: "MXN", total: 17, ...(puede ? { monto: 32430.06 } : {}) }],
  },
  top_ocs_por_moneda: puede ? { disponible: true, monedas: [] } : SIN_PERMISO,
  ocs_en_curso_proxima_entrega: {
    disponible: true,
    drill_down: [],
    drill_down_total: 2,
    drill_down_truncado: false,
  },
  puede_ver_importes: puede,
});
const ocSinEmpresa: PurchaseOrderKpis = {
  generado_en: "2026-11-02T22:14:09Z",
  ocs_abiertas: SIN_EMPRESA,
  ocs_vencidas_sin_recibir: SIN_EMPRESA,
  ciclo_compra: SIN_EMPRESA,
  gasto_por_categoria: SIN_EMPRESA,
  ocs_por_grupo: SIN_EMPRESA,
  valor_ocs_activas: SIN_EMPRESA,
  top_ocs_por_moneda: SIN_EMPRESA,
  ocs_en_curso_proxima_entrega: SIN_EMPRESA,
  puede_ver_importes: false,
};

test.describe("ordenes/kpis/: Gasto por categoría", () => {
  test("con empresa y permiso: importes, sin empresa = false", () => {
    expect(isPurchaseOrderKpisSinEmpresa(ocConEmpresa(true))).toBe(false);
    const card = cardByLabel(buildPurchaseOrderCards(ocConEmpresa(true), noop), "Gasto por categoría");
    expect(shown(card)).not.toMatch(/No visible|No disponible/);
  });

  test("con empresa sin permiso: No visible", () => {
    expect(isPurchaseOrderKpisSinEmpresa(ocConEmpresa(false))).toBe(false);
    expect(shown(cardByLabel(buildPurchaseOrderCards(ocConEmpresa(false), noop), "Gasto por categoría"))).toBe(
      "No visible",
    );
  });

  test("sin empresa: No disponible con el motivo del backend", () => {
    expect(isPurchaseOrderKpisSinEmpresa(ocSinEmpresa)).toBe(true);
    const card = cardByLabel(buildPurchaseOrderCards(ocSinEmpresa, noop), "Gasto por categoría");
    expect(shown(card)).toBe("No disponible");
    expect(card.unavailableReason).toBe("Usuario sin empresa asignada.");
  });
});

// ── recepciones/kpis/ ──────────────────────────────────────────────────────
const rcConEmpresa = (puede: boolean): PurchaseOrderReceiptKpis => ({
  generado_en: "2026-11-02T22:14:09Z",
  filtros: { sucursal: null, proveedor: null, fecha_desde: null, fecha_hasta: null },
  cumplimiento_cantidad: {
    disponible: true,
    mezcla_unidades: false,
    cantidad_ordenada: 38417,
    cantidad_recibida: 385,
    pct: 1,
    por_unidad: [],
    drill_down: [],
    drill_down_total: 0,
    drill_down_truncado: false,
  },
  recepciones_parciales: { disponible: true, ocs_parciales: 7, ocs_recibidas_o_parciales: 25, pct: 28 },
  diferencia_precio: puede
    ? {
        disponible: true,
        lineas_evaluadas: 1,
        lineas_moneda_distinta: 0,
        por_moneda: [
          { moneda: "MXN", lineas_evaluadas: 1, costo_facturado: 990, costo_pactado_oc: 1000, diferencia: -10, pct: -1 },
        ],
        drill_down: [],
        drill_down_total: 0,
        drill_down_truncado: false,
      }
    : SIN_PERMISO,
  material_rechazado: {
    disponible: true,
    mezcla_unidades: false,
    cantidad_rechazada: 1,
    por_unidad: [{ unidad_id: null, unidad: null, cantidad_rechazada: 1 }],
    ...(puede ? { por_moneda: [{ moneda: "MXN", valor_rechazado: 294.83 }] } : {}),
    drill_down: [],
    drill_down_total: 0,
    drill_down_truncado: false,
  },
  puede_ver_importes: puede,
});
const rcSinEmpresa: PurchaseOrderReceiptKpis = {
  generado_en: "2026-11-02T22:14:09Z",
  filtros: null,
  cumplimiento_cantidad: SIN_EMPRESA,
  recepciones_parciales: SIN_EMPRESA,
  diferencia_precio: SIN_EMPRESA,
  material_rechazado: SIN_EMPRESA,
  puede_ver_importes: false,
};
const PRICE = "Diferencias de precio/costo";

test.describe("recepciones/kpis/: Diferencias de precio/costo", () => {
  test("con empresa y permiso: importes", () => {
    expect(isPurchaseOrderReceiptKpisSinEmpresa(rcConEmpresa(true))).toBe(false);
    expect(shown(cardByLabel(buildReceiptCards(rcConEmpresa(true), noop), PRICE))).not.toMatch(
      /No visible|No disponible/,
    );
  });

  test("con empresa sin permiso: No visible", () => {
    expect(isPurchaseOrderReceiptKpisSinEmpresa(rcConEmpresa(false))).toBe(false);
    expect(shown(cardByLabel(buildReceiptCards(rcConEmpresa(false), noop), PRICE))).toBe("No visible");
  });

  test("sin empresa: No disponible con el motivo del backend", () => {
    expect(isPurchaseOrderReceiptKpisSinEmpresa(rcSinEmpresa)).toBe(true);
    const card = cardByLabel(buildReceiptCards(rcSinEmpresa, noop), PRICE);
    expect(shown(card)).toBe("No disponible");
    expect(card.unavailableReason).toBe("Usuario sin empresa asignada.");
  });
});

// ── proveedores/kpis/ ──────────────────────────────────────────────────────
const proveedoresConEmpresa = (puede: boolean): SupplierKpis => ({
  generado_en: "2026-11-02T22:14:09Z",
  disponible: true,
  puede_ver_importes: puede,
  filtros: { sucursal: null, proveedor: null, fecha_desde: null, fecha_hasta: null, meta_scorecard: 80, limite: 50 },
  proveedores: [
    {
      proveedor_id: 1,
      proveedor_nombre: "PRUEBA",
      entrega_a_tiempo: { pct: null, recepciones_a_tiempo: 0, recepciones_total: 1, recepciones_con_compromiso: 0 },
      calidad: { pct_rechazado: 0, cantidad_rechazada: 0, cantidad_inspeccionada: 1 },
      lead_time: { dias_promedio_real: null, dias_promedio_pactado: null, recepciones_medidas: 0 },
      cumplimiento_cantidad: { pct: 100, mezcla_unidades: false, cantidad_ordenada: 1, cantidad_recibida: 1, por_unidad: [] },
      diferencia_precio: {
        pct: 0,
        por_moneda: [
          puede ? { moneda: "MXN", costo_facturado: 10, costo_pactado_oc: 10, pct: 0 } : { moneda: "MXN", pct: 0 },
        ],
      },
      scorecard: { puntaje: 100, semaforo: "verde" },
    },
  ],
  total_proveedores: 1,
  truncado: false,
});
const proveedoresSinEmpresa: SupplierKpis = {
  generado_en: "2026-11-02T22:14:09Z",
  disponible: false,
  motivo: "Usuario sin empresa asignada.",
  puede_ver_importes: false,
  filtros: null,
  proveedores: [],
  total_proveedores: 0,
  truncado: false,
};
const SCORECARD = "Scorecard general";

test.describe("proveedores/kpis/: Scorecard", () => {
  test("con empresa, con o sin permiso: el Scorecard se ve igual", () => {
    for (const puede of [true, false]) {
      expect(isSupplierKpisSinEmpresa(proveedoresConEmpresa(puede))).toBe(false);
      expect(shown(cardByLabel(buildSupplierCards(proveedoresConEmpresa(puede), noop), SCORECARD))).toBe("1 de 1");
    }
  });

  test("sin empresa: No disponible con el motivo del backend", () => {
    expect(isSupplierKpisSinEmpresa(proveedoresSinEmpresa)).toBe(true);
    const card = cardByLabel(buildSupplierCards(proveedoresSinEmpresa, noop), SCORECARD);
    expect(shown(card)).toBe("No disponible");
    expect(card.unavailableReason).toBe("Usuario sin empresa asignada.");
  });
});
