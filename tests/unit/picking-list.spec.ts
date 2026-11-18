import { expect, test } from "@playwright/test";
import { partialMatchKey } from "@tanstack/react-query";
import { readServerTableState, toServerTableCriteria } from "@/src/utils/serverTableParams";
import {
  PICKING_DETAIL_QUERY_KEY,
  PICKINGS_QUERY_KEY,
  pickingDetailQueryKey,
  pickingKpisQueryKey,
} from "@/src/features/picking/constants/pickingQueryKeys";
import { toPickingDetailData } from "@/src/features/picking/utils/picking.utils";
import {
  pickingPrioridadPercent,
  pickingsTable,
  toPickingKpisParams,
  toPickingPrioridadCounts,
} from "@/src/features/picking/utils/pickingList";
import type { Picking, PickingKpis } from "@/src/features/picking/interfaces/picking.interface";

/**
 * EC-915: listado de pickings en modo servidor contra `GET /wms/pickings/`
 * (filtros, búsqueda, orden y KPIs en el backend, EC-921).
 */

const criteriaOf = (query: string) => {
  const params = new URLSearchParams(query);
  return toServerTableCriteria(
    pickingsTable,
    readServerTableState(pickingsTable, (key) => params.get(key)),
  );
};

test.describe("parámetros del listado de pickings", () => {
  test("sin nada elegido: más reciente primero con desempate", () => {
    expect(criteriaOf("")).toEqual({ ordering: "-created_at,-id" });
  });

  test("estado y prioridad viajan tal cual el backend los espera", () => {
    expect(criteriaOf("estado=En%20proceso&prioridad=ALTA")).toEqual({
      estado: "En proceso",
      prioridad: "ALTA",
      ordering: "-created_at,-id",
    });
  });

  test("un estado o una prioridad fuera del catálogo no llegan al backend (sería 400)", () => {
    expect(criteriaOf("estado=EN_PROCESO&prioridad=alta")).toEqual({ ordering: "-created_at,-id" });
    expect(criteriaOf("estado=Pendiente,Parcial")).toEqual({ ordering: "-created_at,-id" });
  });

  test("la búsqueda viaja como `search`", () => {
    expect(criteriaOf("search=PICK-0001")).toEqual({ search: "PICK-0001", ordering: "-created_at,-id" });
  });

  test("cada columna ordenable llega con `-id` de desempate", () => {
    for (const field of ["folio", "pedido_folio", "operador_nombre", "estado", "prioridad", "created_at"]) {
      expect(criteriaOf(`ordering=${field}`)).toEqual({ ordering: `${field},-id` });
      expect(criteriaOf(`ordering=-${field}`)).toEqual({ ordering: `-${field},-id` });
    }
  });

  test("un orden fuera de la lista blanca no llega al backend", () => {
    expect(criteriaOf("ordering=total_lineas")).toEqual({ ordering: "-created_at,-id" });
  });
});

test.describe("indicadores del listado", () => {
  test("kpis/ recibe los mismos filtros y búsqueda, sin orden", () => {
    expect(
      toPickingKpisParams(criteriaOf("estado=Parcial&search=juan&ordering=prioridad")),
    ).toEqual({ estado: "Parcial", search: "juan" });
    expect(toPickingKpisParams(criteriaOf(""))).toEqual({});
  });

  test("por_prioridad se lee por clave, no por posición", () => {
    const kpis: PickingKpis = {
      generado_en: "2026-11-18T12:00:00Z",
      total: 9,
      lineas_por_surtir: 4,
      por_prioridad: [
        { prioridad: "BAJA", prioridad_label: "Baja", total: 5 },
        { prioridad: "ALTA", prioridad_label: "Alta", total: 3 },
        { prioridad: "MEDIA", prioridad_label: "Media", total: 1 },
      ],
    };
    expect(toPickingPrioridadCounts(kpis)).toEqual({ ALTA: 3, MEDIA: 1, BAJA: 5 });
  });

  test("una prioridad ausente queda en 0 y una desconocida se ignora", () => {
    const kpis = {
      generado_en: "2026-11-18T12:00:00Z",
      total: 2,
      lineas_por_surtir: 0,
      por_prioridad: [
        { prioridad: "ALTA", prioridad_label: "Alta", total: 1 },
        { prioridad: "URGENTE", prioridad_label: "Urgente", total: 1 },
      ],
    } as unknown as PickingKpis;
    expect(toPickingPrioridadCounts(kpis)).toEqual({ ALTA: 1, MEDIA: 0, BAJA: 0 });
  });

  test("el desglose usa el total del conjunto como base (como la tarjeta Total)", () => {
    // 1 picking con prioridad fuera del catálogo: cuenta en `total` y en ningún bloque.
    expect(pickingPrioridadPercent(3, 4)).toBe(75);
    expect(pickingPrioridadPercent(0, 0)).toBe(0);
  });
});

test.describe("llaves de caché del listado y del detalle", () => {
  test("Actualizar datos alcanza lista, KPIs y TODOS los detalles", () => {
    expect(partialMatchKey(["pickings", "list", { limit: 20 }], PICKINGS_QUERY_KEY)).toBe(true);
    expect(partialMatchKey(pickingKpisQueryKey({ estado: "Parcial" }), PICKINGS_QUERY_KEY)).toBe(true);
    expect(partialMatchKey(pickingDetailQueryKey(40), PICKING_DETAIL_QUERY_KEY)).toBe(true);
    // El prefijo del listado no alcanza al detalle: por eso se invalidan ambos.
    expect(partialMatchKey(pickingDetailQueryKey(40), PICKINGS_QUERY_KEY)).toBe(false);
  });

  test("la caché del detalle guarda el picking con el instante de la lectura", () => {
    const before = Date.now();
    const data = toPickingDetailData({ id: 40, folio: "PICK-000040" } as Picking);
    expect(data.picking.folio).toBe("PICK-000040");
    expect(data.fetchedAt).toBeGreaterThanOrEqual(before);
    expect(data.fetchedAt).toBeLessThanOrEqual(Date.now());
  });
});
