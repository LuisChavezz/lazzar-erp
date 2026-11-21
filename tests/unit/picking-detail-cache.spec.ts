import { expect, test } from "@playwright/test";
import { partialMatchKey } from "@tanstack/react-query";
import {
  PICKING_DETAIL_QUERY_KEY,
  pickingDetailQueryKey,
} from "@/src/features/picking/constants/pickingQueryKeys";
import { PICKINGS_KEY } from "@/src/features/picking/constants/pickingsTable";
import { toPickingDetailData } from "@/src/features/picking/utils/picking.utils";
import type { Picking } from "@/src/features/picking/interfaces/picking.interface";

/**
 * EC-915: caché del detalle de picking. "Actualizar datos" del listado invalida
 * el prefijo de la lista (`PICKINGS_KEY`) Y el de los detalles; el detalle
 * guarda el instante de la lectura para derivar "vencido" sin `Date.now()` en
 * render.
 */

test.describe("llaves de caché del listado y del detalle", () => {
  test("el prefijo de detalles alcanza a cada detalle", () => {
    expect(partialMatchKey(pickingDetailQueryKey(40), PICKING_DETAIL_QUERY_KEY)).toBe(true);
  });

  test("el prefijo del listado NO alcanza al detalle: por eso se invalidan ambos", () => {
    expect(partialMatchKey(pickingDetailQueryKey(40), PICKINGS_KEY)).toBe(false);
  });
});

test("la caché del detalle guarda el picking con el instante de la lectura", () => {
  const before = Date.now();
  const data = toPickingDetailData({ id: 40, folio: "PICK-000040" } as Picking);
  expect(data.picking.folio).toBe("PICK-000040");
  expect(data.fetchedAt).toBeGreaterThanOrEqual(before);
  expect(data.fetchedAt).toBeLessThanOrEqual(Date.now());
});
