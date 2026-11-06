import { expect, test } from "@playwright/test";
import {
  ORDERS_QUERY_KEY,
  MIS_PEDIDOS_TABLE_QUERY_KEY,
  pedidoFilterOptionsQueryKey,
  pedidoKpisMesaQueryKey,
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
import { isLinkablePedidoRow } from "@/src/features/purchase-orders/utils/linkedPedidoAvailability";

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

  test("manda `cliente` y `moneda` solo con un id positivo (CxC pendiente)", () => {
    expect(toPedidoSearchParams({ q: "", cliente: 12, moneda: 3 })).toEqual({
      cliente: 12,
      moneda: 3,
      limit: PEDIDO_SEARCH_LIMIT,
    });
    expect(toPedidoSearchParams({ q: "", cliente: 0, moneda: 0 })).toEqual({
      limit: PEDIDO_SEARCH_LIMIT,
    });
  });
});

test.describe("filtros de estatus por exclusión", () => {
  test("pedidoEstatusParamExcept deja todo el mapa menos lo excluido, en orden", () => {
    expect(pedidoEstatusParamExcept([])).toBe("1,2,3,4,5");
    expect(pedidoEstatusParamExcept([PEDIDO_ESTATUS.CANCELADO])).toBe("1,2,3,4");
  });

  test("un estatus excluido no viaja en el filtro", () => {
    expect(pedidoEstatusParamExcept([PEDIDO_ESTATUS.POR_AUTORIZAR]).split(",")).not.toContain(
      String(PEDIDO_ESTATUS.POR_AUTORIZAR),
    );
  });

  test("facturables: todo menos Borrador, Por autorizar y Cancelado", () => {
    expect(INVOICEABLE_PEDIDO_ESTATUS).toBe("3,4");
  });

  test("ligables a una OC: todo menos Cancelado", () => {
    expect(LINKABLE_PEDIDO_ESTATUS).toBe("1,2,3,4");
  });
});

test.describe("llaves de pedidos", () => {
  test("todas cuelgan del prefijo `[\"orders\"]`", () => {
    for (const key of [
      ordersQueryKey(),
      ordersQueryKey({ mis_pedidos: "true" }),
      pedidoSearchQueryKey(toPedidoSearchParams({ q: "" })),
      MIS_PEDIDOS_TABLE_QUERY_KEY,
      pedidoKpisMesaQueryKey({ confirmado: "true" }),
      pedidoFilterOptionsQueryKey(true),
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

test.describe("isLinkablePedidoRow (pedidos_vinculados de la OC)", () => {
  test("activo y no cancelado → se puede seguir ligando", () => {
    expect(isLinkablePedidoRow({ estatus: PEDIDO_ESTATUS.AUTORIZADA, activo: true })).toBe(true);
    expect(isLinkablePedidoRow({ estatus: PEDIDO_ESTATUS.BORRADOR, activo: true })).toBe(true);
  });

  test("cancelado → no disponible, aunque siga activo (legado)", () => {
    expect(isLinkablePedidoRow({ estatus: PEDIDO_ESTATUS.CANCELADO, activo: true })).toBe(false);
    expect(isLinkablePedidoRow({ estatus: PEDIDO_ESTATUS.CANCELADO, activo: false })).toBe(false);
  });

  test("dado de baja → no disponible", () => {
    expect(isLinkablePedidoRow({ estatus: PEDIDO_ESTATUS.EN_PROCESO, activo: false })).toBe(false);
  });
});
