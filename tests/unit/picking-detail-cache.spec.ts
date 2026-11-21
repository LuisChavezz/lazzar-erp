import { expect, test } from "@playwright/test";
import { partialMatchKey } from "@tanstack/react-query";
import {
  PICKING_DETAIL_QUERY_KEY,
  pickingDetailQueryKey,
} from "@/src/features/picking/constants/pickingQueryKeys";
import { PICKINGS_KEY, pickingsTable } from "@/src/features/picking/constants/pickingsTable";
import { readServerTableState, toServerTableCriteria } from "@/src/utils/serverTableParams";
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

test.describe("orden del listado de surtidos", () => {
  const criteriaOf = (query: string) => {
    const params = new URLSearchParams(query);
    return toServerTableCriteria(
      pickingsTable,
      readServerTableState(pickingsTable, (key) => params.get(key)),
    );
  };

  test("el orden por defecto y cada columna ordenable llevan `-id` de desempate", () => {
    expect(criteriaOf("").ordering).toBe("-created_at,-id");
    for (const field of ["created_at", "pedido_fecha_entrega", "piezas", "estado_empaque"]) {
      expect(criteriaOf(`ordering=${field}`).ordering).toBe(`${field},-id`);
      expect(criteriaOf(`ordering=-${field}`).ordering).toBe(`-${field},-id`);
    }
  });
});
