import { expect, test } from "@playwright/test";
import { opListPedidoRefs, opPedidoRefs, pedidoRefLabel } from "@/src/features/production-orders/utils/opPedidos";

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

test.describe("opListPedidoRefs", () => {
  test("usa `pedidos` cuando viene", () => {
    expect(
      opListPedidoRefs({ pedido: 5, pedido_folio: "PED-5", pedidos: [{ id: 2, folio: "PED-2" }, { id: 5, folio: "PED-5" }] })
        .map((p) => p.id),
    ).toEqual([5, 2]);
  });

  test("sin `pedidos` cae al pedido único; sin pedido, vacío", () => {
    expect(opListPedidoRefs({ pedido: 7, pedido_folio: null })).toEqual([{ id: 7, folio: null }]);
    expect(opListPedidoRefs({ pedido: 7, pedido_folio: "PED-7", pedidos: [] })).toEqual([{ id: 7, folio: "PED-7" }]);
    expect(opListPedidoRefs({ pedido: null })).toEqual([]);
  });

  test("se calcula una vez por fila", () => {
    const row = { pedido: 7, pedido_folio: "PED-7" };
    expect(opListPedidoRefs(row)).toBe(opListPedidoRefs(row));
  });
});

test("pedidoRefLabel usa `Pedido #id` sin folio", () => {
  expect(pedidoRefLabel({ id: 7, folio: "PED-7" })).toBe("PED-7");
  expect(pedidoRefLabel({ id: 7, folio: null })).toBe("Pedido #7");
  expect(pedidoRefLabel({ id: 7, folio: "" })).toBe("Pedido #7");
});
