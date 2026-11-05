import { expect, test } from "@playwright/test";
import {
  ORDERS_QUERY_KEY,
  linkedPedidoAvailabilityQueryKey,
  ordersQueryKey,
  pedidoSearchQueryKey,
} from "@/src/features/orders/constants/ordersQueryKeys";
import {
  PEDIDO_ESTATUS,
  pedidoEstatusParamExcept,
} from "@/src/features/orders/constants/pedidoStatus";
import {
  PEDIDO_SEARCH_LIMIT,
  toPedidoSearchParams,
} from "@/src/features/orders/utils/pedidoSearchParams";
import { INVOICEABLE_PEDIDO_ESTATUS } from "@/src/features/invoicing/constants/invoiceablePedidos";
import { LINKABLE_PEDIDO_ESTATUS } from "@/src/features/purchase-orders/constants/linkablePedidos";
import { linkedPedidoAvailabilityFromPage } from "@/src/features/purchase-orders/utils/linkedPedidoAvailability";

/**
 * Pruebas unitarias de EC-769: la búsqueda de pedidos de los selectores
 * (parámetros, llaves y filtros de estatus) y la disponibilidad de un pedido ya
 * ligado a una orden de compra.
 */

test.describe("toPedidoSearchParams", () => {
  test("sin término no manda `q`, y `limit` va siempre", () => {
    expect(toPedidoSearchParams({ q: "" })).toEqual({ limit: PEDIDO_SEARCH_LIMIT });
  });

  test("manda `q` y `estatus` cuando tienen valor", () => {
    expect(toPedidoSearchParams({ q: "P-00140", estatus: "3,4" })).toEqual({
      q: "P-00140",
      estatus: "3,4",
      limit: PEDIDO_SEARCH_LIMIT,
    });
  });

  test("un `estatus` vacío no viaja", () => {
    expect(toPedidoSearchParams({ q: "x", estatus: "" })).toEqual({
      q: "x",
      limit: PEDIDO_SEARCH_LIMIT,
    });
  });
});

test.describe("filtros de estatus por exclusión", () => {
  test("pedidoEstatusParamExcept deja todo el mapa menos lo excluido, en orden", () => {
    const todos = Object.values(PEDIDO_ESTATUS);
    expect(pedidoEstatusParamExcept([])).toBe(todos.join(","));
    expect(pedidoEstatusParamExcept([PEDIDO_ESTATUS.CANCELADO])).toBe(
      todos.filter((estatus) => estatus !== PEDIDO_ESTATUS.CANCELADO).join(","),
    );
  });

  test("facturables: todo menos Borrador, Por autorizar y Cancelado", () => {
    const excluidos: number[] = [
      PEDIDO_ESTATUS.BORRADOR,
      PEDIDO_ESTATUS.POR_AUTORIZAR,
      PEDIDO_ESTATUS.CANCELADO,
    ];
    expect(INVOICEABLE_PEDIDO_ESTATUS).toBe(
      Object.values(PEDIDO_ESTATUS)
        .filter((estatus) => !excluidos.includes(estatus))
        .join(","),
    );
    // Con el mapa de hoy:
    expect(INVOICEABLE_PEDIDO_ESTATUS).toBe("3,4");
  });

  test("ligables a una OC: todo menos Cancelado", () => {
    expect(LINKABLE_PEDIDO_ESTATUS.split(",")).not.toContain(String(PEDIDO_ESTATUS.CANCELADO));
    expect(LINKABLE_PEDIDO_ESTATUS).toBe("1,2,3,4");
  });
});

test.describe("llaves de pedidos", () => {
  test("todas cuelgan del prefijo `[\"orders\"]`", () => {
    for (const key of [
      ordersQueryKey(),
      ordersQueryKey({ mis_pedidos: "true" }),
      pedidoSearchQueryKey(toPedidoSearchParams({ q: "" })),
      linkedPedidoAvailabilityQueryKey(1, "P-1"),
    ]) {
      expect(key.slice(0, ORDERS_QUERY_KEY.length)).toEqual([...ORDERS_QUERY_KEY]);
    }
  });

  test("la lista completa va bajo `\"full\"` y una búsqueda nunca", () => {
    expect(ordersQueryKey()).toEqual(["orders", "full"]);
    expect(ordersQueryKey({ estatus: "3,4" })).toEqual(["orders", "full", { estatus: "3,4" }]);
    const search = pedidoSearchQueryKey(toPedidoSearchParams({ q: "abc" }));
    expect(search[1]).toBe("search");
    expect(search).not.toContain("full");
  });
});

test.describe("linkedPedidoAvailabilityFromPage", () => {
  const row = (id: number, estatus: number, activo = true) => ({ id, estatus, activo });

  test("viene en la página y es ligable → disponible", () => {
    expect(
      linkedPedidoAvailabilityFromPage(7, { count: 1, results: [row(7, PEDIDO_ESTATUS.AUTORIZADA)] }),
    ).toBe("available");
  });

  test("viene cancelado → no disponible", () => {
    expect(
      linkedPedidoAvailabilityFromPage(7, { count: 1, results: [row(7, PEDIDO_ESTATUS.CANCELADO)] }),
    ).toBe("unavailable");
  });

  test("viene inactivo → no disponible", () => {
    expect(
      linkedPedidoAvailabilityFromPage(7, {
        count: 1,
        results: [row(7, PEDIDO_ESTATUS.AUTORIZADA, false)],
      }),
    ).toBe("unavailable");
  });

  test("no viene y la página trae todas las coincidencias → no disponible", () => {
    expect(
      linkedPedidoAvailabilityFromPage(7, { count: 1, results: [row(8, PEDIDO_ESTATUS.AUTORIZADA)] }),
    ).toBe("unavailable");
    expect(linkedPedidoAvailabilityFromPage(7, { count: 0, results: [] })).toBe("unavailable");
  });

  test("no viene pero hay más coincidencias que la página → no se sabe", () => {
    expect(
      linkedPedidoAvailabilityFromPage(7, { count: 9, results: [row(8, PEDIDO_ESTATUS.AUTORIZADA)] }),
    ).toBe("unknown");
  });
});
