import { expect, test } from "@playwright/test";
import {
  isPurchaseOrderOpen,
  PURCHASE_ORDER_STATUS as S,
  showsPurchaseOrderPedidoCancelled,
} from "@/src/features/purchase-orders/constants/purchaseOrderStatus";

/**
 * EC-951: el aviso "Pedido cancelado" del listado de OC sale solo mientras la
 * OC sigue abierta (nucleo-erp#1357 marca las autorizadas y parcialmente
 * recibidas). Corren con `npm run test:unit`.
 */

test("abierta: ni cancelada, ni recibida, ni con el saldo cerrado", () => {
  expect(isPurchaseOrderOpen({ estatus: S.AUTORIZADA })).toBe(true);
  expect(isPurchaseOrderOpen({ estatus: S.PARCIALMENTE_RECIBIDA })).toBe(true);
  expect(isPurchaseOrderOpen({ estatus: S.PENDIENTE })).toBe(true);
  expect(isPurchaseOrderOpen({ estatus: S.RECIBIDA })).toBe(false);
  expect(isPurchaseOrderOpen({ estatus: S.RECIBIDA, saldo_cerrado: true })).toBe(false);
  expect(isPurchaseOrderOpen({ estatus: S.CANCELADA })).toBe(false);
});

test("el listado muestra el aviso solo en una OC marcada y abierta", () => {
  expect(showsPurchaseOrderPedidoCancelled({ estatus: S.AUTORIZADA, pedido_cancelado: true })).toBe(true);
  expect(showsPurchaseOrderPedidoCancelled({ estatus: S.PARCIALMENTE_RECIBIDA, pedido_cancelado: true })).toBe(
    true,
  );
  expect(showsPurchaseOrderPedidoCancelled({ estatus: S.AUTORIZADA, pedido_cancelado: false })).toBe(false);
  expect(showsPurchaseOrderPedidoCancelled({ estatus: S.AUTORIZADA })).toBe(false);
  // Con el saldo cerrado se queda solo la etiqueta "Saldo cerrado".
  expect(
    showsPurchaseOrderPedidoCancelled({ estatus: S.RECIBIDA, saldo_cerrado: true, pedido_cancelado: true }),
  ).toBe(false);
  expect(showsPurchaseOrderPedidoCancelled({ estatus: S.RECIBIDA, pedido_cancelado: true })).toBe(false);
  expect(showsPurchaseOrderPedidoCancelled({ estatus: S.CANCELADA, pedido_cancelado: true })).toBe(false);
});
