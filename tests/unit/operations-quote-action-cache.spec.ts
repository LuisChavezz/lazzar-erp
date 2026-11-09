import { expect, test } from "@playwright/test";
import { QueryClient, type QueryKey } from "@tanstack/react-query";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import {
  applyOperationsQuoteActionResult,
  invalidatePedidosAfterFailedAction,
} from "@/src/features/operations/hooks/createOperationsQuoteMutation";
import type { OperationsQuoteActionResponse } from "@/src/features/operations/interfaces/operations-quote.interface";
import {
  invalidatePedidoLinesRewritten,
  invalidatePedidoLists,
} from "@/src/features/orders/hooks/invalidatePedidoLinesRewritten";

/**
 * EC-793: `aceptar-cambios` reescribe los renglones, servicios extras y totales
 * del pedido y responde `{ cotizacion, pedido_id }` (no `pedido`, que solo trae
 * `autorizar`). Las consultas de pedidos se invalidan con las reglas comunes de
 * `orders/hooks/invalidatePedidoLinesRewritten` (las mismas que la edición de
 * Mesa de Control), también cuando el POST falla sin saberse si se aplicó.
 * Corren con `npm run test:unit`.
 */

const PEDIDO_ID = 512;
const OTRO_PEDIDO_ID = 513;

const cotizacion: OperationsQuoteActionResponse["cotizacion"] = {
  id: 77,
  estatus: 3,
  autorizada_at: null,
  cambios_solicitados_at: null,
  updated_at: "2026-11-06T12:00:00Z",
  motivo_rechazo: null,
};

const ORDERS_LIST: QueryKey = ["orders", "full"];
const KPIS_MESA: QueryKey = ["orders", "kpis-mesa", {}];
const KPIS: QueryKey = ["pedido-kpis"];
const DETAIL: QueryKey = ["pedido-detail", PEDIDO_ID];
const OTRO_DETAIL: QueryKey = ["pedido-detail", OTRO_PEDIDO_ID];
const PROGRAMAR: QueryKey = ["pedido-programar", PEDIDO_ID];
const TRAZABILIDAD: QueryKey = ["pedido-trazabilidad", PEDIDO_ID];
const SCHEDULED: QueryKey = ["picking-onboarding", null];
/** Ajena a los pedidos: ninguna regla de pedidos debe tocarla. */
const AJENA: QueryKey = ["warehouses"];

const LISTS = [ORDERS_LIST, KPIS_MESA, KPIS];
const PER_PEDIDO = [DETAIL, OTRO_DETAIL, PROGRAMAR, TRAZABILIDAD, SCHEDULED];
const ALL = [...LISTS, ...PER_PEDIDO, AJENA];

const seed = () => {
  const queryClient = new QueryClient();
  for (const key of ALL) queryClient.setQueryData(key, {});
  return queryClient;
};

const invalidated = (queryClient: QueryClient) =>
  ALL.filter((key) => queryClient.getQueryState(key)?.isInvalidated);

const httpError = (status: number): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data: {} } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, undefined, response);
};

const networkError = () =>
  new AxiosError("Network Error", "ERR_NETWORK", { headers: new AxiosHeaders() });

test.describe("reglas comunes de pedidos", () => {
  test("listados: `[\"orders\"]` por prefijo y `pedido-kpis`, nada por pedido", async () => {
    const queryClient = seed();
    await invalidatePedidoLists(queryClient);
    expect(invalidated(queryClient)).toEqual(LISTS);
  });

  test("renglones reescritos: listados, detalle, trazabilidad, programar y programados", async () => {
    const queryClient = seed();
    await invalidatePedidoLinesRewritten(queryClient);
    expect(invalidated(queryClient)).toEqual([...LISTS, ...PER_PEDIDO]);
  });
});

test.describe("éxito de una acción de mesa de control", () => {
  test("aceptar cambios (`pedido_id`) usa la regla de renglones reescritos", async () => {
    const queryClient = seed();
    await applyOperationsQuoteActionResult(queryClient, { cotizacion, pedido_id: PEDIDO_ID });
    expect(invalidated(queryClient)).toEqual([...LISTS, ...PER_PEDIDO]);
  });

  test("autorizar (`pedido`) solo invalida los listados", async () => {
    const queryClient = seed();
    await applyOperationsQuoteActionResult(queryClient, {
      cotizacion,
      pedido: { id: PEDIDO_ID, folio: "PED-1" },
    });
    expect(invalidated(queryClient)).toEqual(LISTS);
  });

  test("rechazar y rechazar cambios (sin pedido) no tocan pedidos", async () => {
    const queryClient = seed();
    await applyOperationsQuoteActionResult(queryClient, { cotizacion });
    expect(invalidated(queryClient)).toEqual([]);
  });
});

test.describe("error de una acción de mesa de control", () => {
  for (const [label, error] of [
    ["red caída", networkError()],
    ["500", httpError(500)],
    ["401 tras fallar el refresco", httpError(401)],
  ] as const) {
    test(`resultado incierto (${label}): aceptar cambios invalida como en el éxito`, () => {
      const queryClient = seed();
      invalidatePedidosAfterFailedAction(queryClient, error, "rewrites");
      expect(invalidated(queryClient)).toEqual([...LISTS, ...PER_PEDIDO]);
    });
  }

  test("resultado incierto: autorizar invalida solo los listados", () => {
    const queryClient = seed();
    invalidatePedidosAfterFailedAction(queryClient, networkError(), "creates");
    expect(invalidated(queryClient)).toEqual(LISTS);
  });

  test("resultado incierto: rechazar cambios no toca pedidos", () => {
    const queryClient = seed();
    invalidatePedidosAfterFailedAction(queryClient, networkError(), "none");
    expect(invalidated(queryClient)).toEqual([]);
  });

  for (const status of [400, 403, 404, 409]) {
    test(`rechazo definitivo (${status}): nada cambió, no se toca ningún pedido`, () => {
      const queryClient = seed();
      invalidatePedidosAfterFailedAction(queryClient, httpError(status), "rewrites");
      expect(invalidated(queryClient)).toEqual([]);
    });
  }
});
