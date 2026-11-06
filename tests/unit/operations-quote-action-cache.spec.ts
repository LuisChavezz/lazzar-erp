import { expect, test } from "@playwright/test";
import { QueryClient, type QueryKey } from "@tanstack/react-query";
import { applyOperationsQuoteActionResult } from "@/src/features/operations/hooks/createOperationsQuoteMutation";
import type { OperationsQuoteActionResponse } from "@/src/features/operations/interfaces/operations-quote.interface";

/**
 * EC-793: `aceptar-cambios` reescribe los renglones, servicios extras y totales
 * del pedido y responde `{ cotizacion, pedido_id }` (no `pedido`, que solo trae
 * `autorizar`). Antes solo `pedido` invalidaba las consultas de pedidos, así
 * que la lista y el detalle seguían con lo anterior hasta que venciera el
 * staleTime. Corren con `npm run test:unit`.
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
const KPIS: QueryKey = ["pedido-kpis"];
const DETAIL: QueryKey = ["pedido-detail", PEDIDO_ID];
const PROGRAMAR: QueryKey = ["pedido-programar", PEDIDO_ID];
const TRAZABILIDAD: QueryKey = ["pedido-trazabilidad", PEDIDO_ID];
const SCHEDULED: QueryKey = ["picking-onboarding", null];
const OTRO_DETAIL: QueryKey = ["pedido-detail", OTRO_PEDIDO_ID];

const seed = () => {
  const queryClient = new QueryClient();
  for (const key of [ORDERS_LIST, KPIS, DETAIL, PROGRAMAR, TRAZABILIDAD, SCHEDULED, OTRO_DETAIL]) {
    queryClient.setQueryData(key, {});
  }
  return queryClient;
};

const isInvalidated = (queryClient: QueryClient, key: QueryKey) =>
  queryClient.getQueryState(key)?.isInvalidated;

test("aceptar cambios (`pedido_id`) invalida las listas y las consultas de ESE pedido", async () => {
  const queryClient = seed();

  await applyOperationsQuoteActionResult(queryClient, { cotizacion, pedido_id: PEDIDO_ID });

  for (const key of [ORDERS_LIST, KPIS, DETAIL, PROGRAMAR, TRAZABILIDAD, SCHEDULED]) {
    expect(isInvalidated(queryClient, key), JSON.stringify(key)).toBe(true);
  }
  expect(isInvalidated(queryClient, OTRO_DETAIL)).toBe(false);
});

test("autorizar (`pedido`) invalida las listas, no el detalle de ningún pedido", async () => {
  const queryClient = seed();

  await applyOperationsQuoteActionResult(queryClient, {
    cotizacion,
    pedido: { id: PEDIDO_ID, folio: "PED-1" },
  });

  expect(isInvalidated(queryClient, ORDERS_LIST)).toBe(true);
  expect(isInvalidated(queryClient, KPIS)).toBe(true);
  for (const key of [DETAIL, PROGRAMAR, TRAZABILIDAD, SCHEDULED]) {
    expect(isInvalidated(queryClient, key), JSON.stringify(key)).toBe(false);
  }
});

test("rechazar y rechazar cambios (sin pedido) no tocan ninguna consulta de pedidos", async () => {
  const queryClient = seed();

  await applyOperationsQuoteActionResult(queryClient, { cotizacion });

  for (const key of [ORDERS_LIST, KPIS, DETAIL, PROGRAMAR, TRAZABILIDAD, SCHEDULED, OTRO_DETAIL]) {
    expect(isInvalidated(queryClient, key), JSON.stringify(key)).toBe(false);
  }
});
