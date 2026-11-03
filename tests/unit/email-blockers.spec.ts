import { expect, test } from "@playwright/test";
import { PURCHASE_ORDER_STATUS } from "@/src/features/purchase-orders/constants/purchaseOrderStatus";
import type { PurchaseOrderDetail } from "@/src/features/purchase-orders/interfaces/purchase-order.interface";
import { getPurchaseOrderEmailBlocker } from "@/src/features/purchase-orders/utils/purchaseOrderEmailBlocker";
import { getInvoiceEmailBlocker } from "@/src/features/invoicing/utils/invoiceEmailBlocker";

/**
 * Pruebas unitarias de EC-700: las guardas que deciden si un correo puede
 * salir. Se aplican al preparar Y otra vez al enviar, sobre la lectura fresca
 * del registro. Corren con `npm run test:unit`.
 */

const order = (patch: Partial<PurchaseOrderDetail>) =>
  ({ estatus: PURCHASE_ORDER_STATUS.AUTORIZADA, gran_total: "100.00", ...patch }) as PurchaseOrderDetail;

test("OC autorizada, parcialmente recibida o recibida, con importes: se puede enviar", () => {
  for (const estatus of [
    PURCHASE_ORDER_STATUS.AUTORIZADA,
    PURCHASE_ORDER_STATUS.PARCIALMENTE_RECIBIDA,
    PURCHASE_ORDER_STATUS.RECIBIDA,
  ]) {
    expect(getPurchaseOrderEmailBlocker(order({ estatus }))).toBeNull();
  }
});

test("OC cancelada o regresada a borrador/pendiente: bloqueada por estatus", () => {
  for (const estatus of [
    PURCHASE_ORDER_STATUS.CANCELADA,
    PURCHASE_ORDER_STATUS.PENDIENTE,
    PURCHASE_ORDER_STATUS.BORRADOR,
  ]) {
    expect(getPurchaseOrderEmailBlocker(order({ estatus }))?.reason).toBe("status");
  }
});

test("OC sin importes visibles para el rol: bloqueada por importes", () => {
  const sinImportes = order({ gran_total: undefined, total: undefined, subtotal: undefined });

  expect(getPurchaseOrderEmailBlocker(sinImportes)?.reason).toBe("amounts");
});

test("el estatus manda sobre los importes", () => {
  const blocker = getPurchaseOrderEmailBlocker(
    order({ estatus: PURCHASE_ORDER_STATUS.CANCELADA, gran_total: undefined }),
  );

  expect(blocker?.reason).toBe("status");
});

test("factura: eliminada, cancelada o sin destinatario bloquea; activa y emitida pasa", () => {
  const base: Parameters<typeof getInvoiceEmailBlocker>[0] = {
    activo: true,
    estatus: "Emitida",
    correo_facturas: "test@x.com",
  };

  expect(getInvoiceEmailBlocker(base)).toBeNull();
  expect(getInvoiceEmailBlocker({ ...base, activo: false })?.reason).toBe("deleted");
  expect(getInvoiceEmailBlocker({ ...base, estatus: "Cancelada" })?.reason).toBe("not-sendable");
  expect(getInvoiceEmailBlocker({ ...base, correo_facturas: null })?.reason).toBe("no-recipient");
});
