import { expect, test } from "@playwright/test";
import { SALIDAS_MAQUILA_TABLE } from "../../src/features/maquila-outputs/constants/salidasMaquilaTable";
import { salidasMaquilaToastId } from "@/src/features/maquila-outputs/hooks/useSalidasMaquila";
import {
  readServerTableState,
  serverTableDefaultPageSize,
  writeServerTableQuery,
} from "../../src/utils/serverTableParams";

const read = (query: string) => {
  const params = new URLSearchParams(query);
  return readServerTableState(SALIDAS_MAQUILA_TABLE, (key) => params.get(key)).filters;
};

const write = (filters: ReturnType<typeof read>) =>
  writeServerTableQuery(
    SALIDAS_MAQUILA_TABLE,
    { filters, search: "", ordering: null, page: 1, pageSize: serverTableDefaultPageSize(SALIDAS_MAQUILA_TABLE) },
    new URLSearchParams(),
  ).toString();

test.describe("filtros del listado de SM en la URL (EC-868)", () => {
  test("lee op y centro_confeccion con los nombres del backend", () => {
    expect(read("op=82&centro_confeccion=8")).toEqual({ op: 82, centro_confeccion: 8 });
  });

  test("un id inválido se trata como ausente: nunca viaja al backend", () => {
    expect(read("op=abc&centro_confeccion=-3")).toEqual({});
    expect(read("op=0&centro_confeccion=8.5")).toEqual({});
  });

  test("escribe solo los filtros puestos, sin page ni page_size", () => {
    expect(write({ op: 82 })).toBe("op=82");
    expect(write({ op: 82, centro_confeccion: 8 })).toBe("op=82&centro_confeccion=8");
    expect(write({})).toBe("");
  });
});

test.describe("toast de refetch del listado de SM (EC-868)", () => {
  test("cada combinación de filtros tiene su propio id", () => {
    const ids = [
      salidasMaquilaToastId({}),
      salidasMaquilaToastId({ op: 82 }),
      salidasMaquilaToastId({ centro_confeccion: 8 }),
      salidasMaquilaToastId({ op: 82, centro_confeccion: 8 }),
      salidasMaquilaToastId({ estatus: "ENVIADA" }),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(salidasMaquilaToastId({ op: 82, centro_confeccion: 8 })).toBe(
      salidasMaquilaToastId({ centro_confeccion: 8, op: 82 }),
    );
  });
});
