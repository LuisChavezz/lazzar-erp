import { expect, test } from "@playwright/test";
import { opPedidoRefs, pedidoRefLabel } from "@/src/features/production-orders/utils/opPedidos";

/**
 * EC-865: una OP puede cubrir varios pedidos (`pedidos`, principal primero).
 * `opPedidoRefs` decide qué se muestra y `null` hace caer al pedido único.
 */
test.describe("opPedidoRefs", () => {
  test("sin `pedidos` o vacío devuelve null (se usa el pedido único)", () => {
    expect(opPedidoRefs(undefined, 5)).toBeNull();
    expect(opPedidoRefs(null, 5)).toBeNull();
    expect(opPedidoRefs([], 5)).toBeNull();
  });

  test("respeta el orden del backend con el principal primero", () => {
    const pedidos = [
      { id: 5, folio: "PED-5" },
      { id: 2, folio: "PED-2" },
      { id: 9, folio: null },
    ];
    expect(opPedidoRefs(pedidos, 5)).toEqual(pedidos);
  });

  test("pone el principal primero aunque llegue después", () => {
    expect(
      opPedidoRefs(
        [
          { id: 2, folio: "PED-2" },
          { id: 5, folio: "PED-5" },
        ],
        5,
      )?.map((p) => p.id),
    ).toEqual([5, 2]);
  });

  test("sin principal conserva el orden y quita repetidos", () => {
    expect(
      opPedidoRefs(
        [
          { id: 2, folio: "PED-2" },
          { id: 3, folio: "PED-3" },
          { id: 2, folio: "PED-2" },
        ],
        null,
      )?.map((p) => p.id),
    ).toEqual([2, 3]);
  });
});

test("pedidoRefLabel usa `Pedido #id` sin folio", () => {
  expect(pedidoRefLabel({ id: 7, folio: "PED-7" })).toBe("PED-7");
  expect(pedidoRefLabel({ id: 7, folio: null })).toBe("Pedido #7");
  expect(pedidoRefLabel({ id: 7, folio: "" })).toBe("Pedido #7");
});
