import { expect, test } from "@playwright/test";
import {
  linkedPedidoClientes,
  pedidoOmisionLabel,
  pedidosOmitidosWarning,
} from "@/src/features/pre-orders/utils/pedidosOmitidos";
import type {
  PedidosOmitidosFuente,
  PreOrderPedidoVinculado,
} from "@/src/features/pre-orders/interfaces/pre-order.interface";

const libre: PreOrderPedidoVinculado = { id: 1, folio: "P-1", cliente_nombre: "ACME", motivo_omision: null };
const cancelado: PreOrderPedidoVinculado = { id: 2, folio: "P-2", cliente_nombre: "Beta", motivo_omision: "cancelado" };

const pre = (fuente: PedidosOmitidosFuente | null, pedidos = [libre, cancelado]) => ({
  pedidos_omitidos_fuente: fuente,
  pedidos_vinculados: pedidos,
});

test.describe("pedidosOmitidosWarning", () => {
  test("sin omitidos no avisa", () => {
    expect(pedidosOmitidosWarning([])).toBeNull();
    expect(pedidosOmitidosWarning(undefined)).toBeNull();
  });

  test("uno: folio y motivo", () => {
    expect(pedidosOmitidosWarning([{ id: 2, folio: "P-2", motivo: "cancelado" }])).toBe(
      "El pedido P-2 (cancelado) no se ligó a la OP.",
    );
  });

  test("varios, con #id cuando no hay folio", () => {
    expect(
      pedidosOmitidosWarning([
        { id: 2, folio: "P-2", motivo: "cancelado" },
        { id: 12, folio: null, motivo: "dado de baja" },
      ]),
    ).toBe("Estos pedidos no se ligaron a la OP: P-2 (cancelado), #12 (dado de baja).");
  });
});

test.describe("pedidoOmisionLabel", () => {
  test("vista previa en futuro, registrada en pasado", () => {
    expect(pedidoOmisionLabel(pre("vista_previa"), cancelado)).toBe("Quedará fuera de la OP: cancelado");
    expect(pedidoOmisionLabel(pre("registrada"), cancelado)).toBe("Quedó fuera de la OP: cancelado");
  });

  test("sin motivo, sin_registro o sin fuente: sin marca", () => {
    expect(pedidoOmisionLabel(pre("vista_previa"), libre)).toBeNull();
    expect(pedidoOmisionLabel(pre("sin_registro"), cancelado)).toBeNull();
    expect(pedidoOmisionLabel(pre(null), cancelado)).toBeNull();
  });
});

test.describe("linkedPedidoClientes", () => {
  test("excluye los omitidos en vista previa y registrada", () => {
    expect(linkedPedidoClientes(pre("vista_previa"))).toEqual(["ACME"]);
    expect(linkedPedidoClientes(pre("registrada"))).toEqual(["ACME"]);
  });

  test("sin_registro muestra todos", () => {
    expect(linkedPedidoClientes(pre("sin_registro"))).toEqual(["ACME", "Beta"]);
  });

  test("todos omitidos: vacío", () => {
    expect(linkedPedidoClientes(pre("registrada", [cancelado]))).toEqual([]);
  });
});
