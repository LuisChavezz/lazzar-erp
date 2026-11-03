import { expect, test } from "@playwright/test";
import {
  getPurchaseOrderProgress,
  progressBarClass,
} from "@/src/features/purchase-orders/utils/purchaseOrderProgress";

test.describe("getPurchaseOrderProgress", () => {
  test("lee piezas recibidas y porcentaje del backend", () => {
    expect(
      getPurchaseOrderProgress({ total_piezas: 5, piezas_recibidas: "5.0000", progreso_pct: 100 }),
    ).toEqual({ recibidas: 5, solicitadas: 5, pct: 100 });
  });

  test("sin los campos devuelve null (no inventa un 0 %)", () => {
    expect(getPurchaseOrderProgress({ total_piezas: 5 })).toBeNull();
    expect(
      getPurchaseOrderProgress({ total_piezas: 5, piezas_recibidas: null, progreso_pct: 0 }),
    ).toBeNull();
    expect(
      getPurchaseOrderProgress({ total_piezas: 5, piezas_recibidas: "abc", progreso_pct: 10 }),
    ).toBeNull();
  });

  test("acota el porcentaje a 0–100 y lo redondea", () => {
    expect(
      getPurchaseOrderProgress({ total_piezas: 3, piezas_recibidas: "4", progreso_pct: 133.3 })?.pct,
    ).toBe(100);
    expect(
      getPurchaseOrderProgress({ total_piezas: 3, piezas_recibidas: "1", progreso_pct: 33.4 })?.pct,
    ).toBe(33);
  });

  test("verde al completar, azul en curso", () => {
    expect(progressBarClass(100)).toBe("bg-emerald-500");
    expect(progressBarClass(40)).toBe("bg-sky-500");
  });
});
