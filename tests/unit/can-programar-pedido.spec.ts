import { expect, test } from "@playwright/test";
import { canProgramarPedido, PEDIDO_ESTATUS } from "@/src/features/orders/constants/pedidoStatus";

/**
 * Pruebas unitarias de EC-748: "Programar" en Mesa de Control solo para pedidos
 * confirmados (`fecha_confirmacion` no nula) y no cancelados.
 */
const FECHA = "2026-11-15T00:00:00-06:00";

test.describe("canProgramarPedido", () => {
  test("confirmado y no cancelado: se ofrece", () => {
    expect(
      canProgramarPedido({ estatus: PEDIDO_ESTATUS.AUTORIZADA, fecha_confirmacion: FECHA }),
    ).toBe(true);
  });

  test("sin fecha_confirmacion: no se ofrece", () => {
    expect(
      canProgramarPedido({ estatus: PEDIDO_ESTATUS.AUTORIZADA, fecha_confirmacion: null }),
    ).toBe(false);
  });

  test("cancelado con fecha_confirmacion: no se ofrece", () => {
    expect(
      canProgramarPedido({ estatus: PEDIDO_ESTATUS.CANCELADO, fecha_confirmacion: FECHA }),
    ).toBe(false);
  });

  test("cancelado sin fecha_confirmacion: no se ofrece", () => {
    expect(
      canProgramarPedido({ estatus: PEDIDO_ESTATUS.CANCELADO, fecha_confirmacion: null }),
    ).toBe(false);
  });
});
