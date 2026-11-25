import { expect, test } from "@playwright/test";
import {
  isPurchaseOrderBalanceClosable,
  isPurchaseOrderBalanceClosed,
  purchaseOrderStatusEntry,
} from "@/src/features/purchase-orders/constants/purchaseOrderStatus";
import { purchaseOrderPdfStatusBanner } from "@/src/features/purchase-orders/utils/purchaseOrderPdfDescriptor";

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
