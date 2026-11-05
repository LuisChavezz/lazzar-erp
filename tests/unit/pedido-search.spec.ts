import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
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
import {
  linkedPedidoLookupFromDetailError,
  linkedPedidoLookupFromPage,
} from "@/src/features/purchase-orders/utils/linkedPedidoAvailability";

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

test.describe("linkedPedidoLookupFromPage", () => {
  const row = (id: number, estatus: number, activo = true) => ({
    id,
    estatus,
    activo,
    cliente_nombre: `Cliente ${id}`,
    cliente_razon_social: null,
  });

  test("viene en la página y es ligable → disponible, con su cliente", () => {
    expect(
      linkedPedidoLookupFromPage(7, { count: 1, results: [row(7, PEDIDO_ESTATUS.AUTORIZADA)] }),
    ).toEqual({ availability: "available", cliente: "Cliente 7" });
  });

  test("sin nombre de cliente usa la razón social", () => {
    expect(
      linkedPedidoLookupFromPage(7, {
        count: 1,
        results: [{ ...row(7, PEDIDO_ESTATUS.AUTORIZADA), cliente_nombre: null, cliente_razon_social: "RS SA" }],
      }).cliente,
    ).toBe("RS SA");
  });

  test("viene cancelado → no disponible", () => {
    expect(
      linkedPedidoLookupFromPage(7, { count: 1, results: [row(7, PEDIDO_ESTATUS.CANCELADO)] })
        .availability,
    ).toBe("unavailable");
  });

  test("viene inactivo → no disponible", () => {
    expect(
      linkedPedidoLookupFromPage(7, { count: 1, results: [row(7, PEDIDO_ESTATUS.AUTORIZADA, false)] })
        .availability,
    ).toBe("unavailable");
  });

  test("no viene y la página trae todas las coincidencias → no disponible", () => {
    expect(
      linkedPedidoLookupFromPage(7, { count: 1, results: [row(8, PEDIDO_ESTATUS.AUTORIZADA)] })
        .availability,
    ).toBe("unavailable");
    expect(linkedPedidoLookupFromPage(7, { count: 0, results: [] }).availability).toBe(
      "unavailable",
    );
  });

  test("no viene pero hay más coincidencias que la página → no se sabe", () => {
    expect(
      linkedPedidoLookupFromPage(7, { count: 9, results: [row(8, PEDIDO_ESTATUS.AUTORIZADA)] })
        .availability,
    ).toBe("unknown");
  });
});

test.describe("linkedPedidoLookupFromDetailError", () => {
  const httpError = (status: number) =>
    new AxiosError("fallo", "ERR_BAD_RESPONSE", undefined, undefined, {
      status,
      statusText: "",
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: {},
    });

  test("404 y 403 → no disponible (ya no existe o ya no está al alcance)", () => {
    expect(linkedPedidoLookupFromDetailError(httpError(404))).toEqual({
      availability: "unavailable",
      cliente: null,
    });
    expect(linkedPedidoLookupFromDetailError(httpError(403))?.availability).toBe("unavailable");
  });

  test("5xx o red → sin decidir (el hook lo deja como error)", () => {
    expect(linkedPedidoLookupFromDetailError(httpError(500))).toBeNull();
    expect(linkedPedidoLookupFromDetailError(new AxiosError("Network Error", "ERR_NETWORK"))).toBeNull();
  });
});
