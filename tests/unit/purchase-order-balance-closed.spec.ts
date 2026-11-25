import { expect, test } from "@playwright/test";
import {
  isPurchaseOrderBalanceClosable,
  isPurchaseOrderBalanceClosed,
  purchaseOrderStatusEntry,
} from "@/src/features/purchase-orders/constants/purchaseOrderStatus";
import { purchaseOrderPdfStatusBanner } from "@/src/features/purchase-orders/utils/purchaseOrderPdfDescriptor";
import { getPurchaseOrderColumnText } from "@/src/features/purchase-orders/utils/purchaseOrderExport";
import type { PurchaseOrder } from "@/src/features/purchase-orders/interfaces/purchase-order.interface";

// EC-947: `cerrar-saldo/` deja la OC en estatus 5 con `saldo_cerrado`.
test.describe("saldo cerrado de una OC", () => {
  test("solo la parcialmente recibida (4) admite cerrar el saldo", () => {
    expect([1, 2, 3, 4, 5, 6].filter(isPurchaseOrderBalanceClosable)).toEqual([4]);
  });

  test("una Recibida con saldo cerrado se rotula 'Saldo cerrado' con el color de Recibida", () => {
    const closed = purchaseOrderStatusEntry(5, "Recibida", true);
    const received = purchaseOrderStatusEntry(5, "Recibida");
    expect(closed.label).toBe("Saldo cerrado");
    expect(received.label).toBe("Recibida");
    expect(closed.cls).toBe(received.cls);
    expect(closed.dot).toBe(received.dot);
  });

  test("saldo_cerrado fuera del estatus 5 no cambia la etiqueta", () => {
    expect(purchaseOrderStatusEntry(4, null, true).label).toBe("Parcialmente recibida");
    expect(purchaseOrderStatusEntry(6, null, true).label).toBe("Cancelada");
    expect(isPurchaseOrderBalanceClosed({ estatus: 4, saldo_cerrado: true })).toBe(false);
    expect(isPurchaseOrderBalanceClosed({ estatus: 5 })).toBe(false);
  });

  test("el PDF lleva el banner SALDO CERRADO con la fecha y sin el motivo interno", () => {
    const order = {
      estatus: 5,
      saldo_cerrado: true,
      motivo_cierre: "Proveedor incumplido, no volver a comprarle",
      fecha_cierre: "2026-11-24T18:30:00Z",
    };
    const banner = purchaseOrderPdfStatusBanner(order);
    expect(banner?.title).toBe("SALDO CERRADO");
    expect(banner?.detail).toMatch(/^Cerrado el .*[ap]\.m\.$/);
    expect(JSON.stringify(banner)).not.toContain("Proveedor incumplido");
  });

  test("sin saldo cerrado el PDF no lleva banner", () => {
    expect(
      purchaseOrderPdfStatusBanner({ estatus: 5, saldo_cerrado: false, fecha_cierre: null }),
    ).toBeNull();
    expect(purchaseOrderPdfStatusBanner({ estatus: 5, fecha_cierre: undefined })).toBeNull();
  });

  test("un saldo cerrado sin fecha lleva solo el título", () => {
    expect(purchaseOrderPdfStatusBanner({ estatus: 5, saldo_cerrado: true, fecha_cierre: null })).toEqual({
      title: "SALDO CERRADO",
      detail: null,
    });
  });
});

// El folio del listado exportado (PDF y Excel comparten `getPurchaseOrderColumnText`)
// lleva el estatus con la etiqueta del badge de la tabla, no `estatus_label`.
test.describe("estatus de la OC en la exportación del listado", () => {
  const folioColumn = { id: "folio", header: "O.C." };
  const order = (overrides: Partial<PurchaseOrder>): PurchaseOrder =>
    ({ id: 7, folio: "OC-7", estatus: 5, estatus_label: "Recibida", referencia: "", ...overrides }) as PurchaseOrder;

  test("una Recibida con el saldo cerrado se exporta como 'Saldo cerrado'", () => {
    expect(getPurchaseOrderColumnText(order({ saldo_cerrado: true }), folioColumn)).toBe("OC-7 · Saldo cerrado");
  });

  test("una Recibida sin saldo cerrado sigue como 'Recibida'", () => {
    expect(getPurchaseOrderColumnText(order({ saldo_cerrado: false }), folioColumn)).toBe("OC-7 · Recibida");
    expect(getPurchaseOrderColumnText(order({ referencia: "REF-1" }), folioColumn)).toBe("OC-7 · Recibida · REF-1");
  });

  test("un estatus fuera del mapa local usa el estatus_label del backend", () => {
    expect(getPurchaseOrderColumnText(order({ estatus: 9, estatus_label: "Rara" }), folioColumn)).toBe("OC-7 · Rara");
  });
});
