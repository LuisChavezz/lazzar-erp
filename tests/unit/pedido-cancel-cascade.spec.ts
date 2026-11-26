import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { pedidoCancelBlockingOcs } from "@/src/features/orders/utils/pedidoCancelBlockingOcs";
import { pedidoCancelSummary } from "@/src/features/orders/utils/pedidoCancelSummary";

/**
 * EC-951: la cascada de `POST /ventas/pedidos/{id}/cancelar/` (nucleo-erp#1357
 * y #1413). El 400 con OC en borrador o por autorizar trae
 * `ordenes_compra_bloqueantes`, y el éxito cuenta las pre-órdenes canceladas y
 * las OC marcadas en el toast. Corren con `npm run test:unit`.
 */

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
};

const MENSAJE = "Tiene OC en borrador o por autorizar: OC-1, #2. Cancélalas o autorízalas primero.";

test("lee las OC bloqueantes del 400, con folio null para la que no tiene", () => {
  const error = httpError(400, {
    ordenes_compra: MENSAJE,
    ordenes_compra_bloqueantes: [
      { id: 1, folio: "OC-1", estatus: 1 },
      { id: 2, folio: null, estatus: 2 },
    ],
  });
  expect(pedidoCancelBlockingOcs(error)).toEqual([
    { id: 1, folio: "OC-1", estatus: 1 },
    { id: 2, folio: null, estatus: 2 },
  ]);
});

test("omite renglones mal formados y lee un folio vacío como null", () => {
  const error = httpError(400, {
    ordenes_compra: MENSAJE,
    ordenes_compra_bloqueantes: [{ id: "3" }, null, { id: 0 }, { id: 4, folio: "  ", estatus: 2 }],
  });
  expect(pedidoCancelBlockingOcs(error)).toEqual([{ id: 4, folio: null, estatus: 2 }]);
});

test("no es el rechazo de OC: otro 400, sin lista, lista vacía u otro estatus", () => {
  expect(pedidoCancelBlockingOcs(httpError(400, { pedido: "Tiene documentos vivos: picking." }))).toBeNull();
  expect(pedidoCancelBlockingOcs(httpError(400, { ordenes_compra: MENSAJE }))).toBeNull();
  expect(
    pedidoCancelBlockingOcs(httpError(400, { ordenes_compra: MENSAJE, ordenes_compra_bloqueantes: [] })),
  ).toBeNull();
  expect(
    pedidoCancelBlockingOcs(
      httpError(500, { ordenes_compra_bloqueantes: [{ id: 1, folio: "OC-1", estatus: 1 }] }),
    ),
  ).toBeNull();
  expect(pedidoCancelBlockingOcs(new Error("red"))).toBeNull();
});

test("el toast cuenta las pre-órdenes canceladas y las OC marcadas", () => {
  expect(
    pedidoCancelSummary(
      {
        folio: "P-00083",
        inventario_devuelto: [],
        reservas_liberadas: 1,
        pre_ordenes_canceladas: [{ id: 9, necesidades_liberadas: 2, necesidades_huerfanas: 1 }],
        ordenes_compra_marcadas: [
          { id: 3, folio: "OC-A" },
          { id: 4, folio: null },
        ],
      },
      { id: 83, folio: "P-00083" },
    ),
  ).toBe("Pedido P-00083 cancelado · 1 reserva liberada, 1 pre-orden cancelada, 2 OC marcadas con pedido cancelado");
});

test("en singular y plural, y sin la cascada el toast queda como antes", () => {
  expect(
    pedidoCancelSummary(
      {
        folio: "P-1",
        pre_ordenes_canceladas: [
          { id: 1, necesidades_liberadas: 0, necesidades_huerfanas: 0 },
          { id: 2, necesidades_liberadas: 0, necesidades_huerfanas: 0 },
        ],
        ordenes_compra_marcadas: [{ id: 3, folio: "OC-A" }],
      },
      { id: 1, folio: "P-1" },
    ),
  ).toBe("Pedido P-1 cancelado · 2 pre-órdenes canceladas, 1 OC marcada con pedido cancelado");
  expect(pedidoCancelSummary({ folio: "P-2", pre_ordenes_canceladas: [], ordenes_compra_marcadas: [] }, { id: 2, folio: "P-2" })).toBe(
    "Pedido P-2 cancelado",
  );
  expect(pedidoCancelSummary({ folio: "P-3" }, { id: 3, folio: "P-3" })).toBe("Pedido P-3 cancelado");
});
