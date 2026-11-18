import {
  defineServerTable,
  positiveIdParam,
  type ServerTableFilterValues,
} from "@/src/utils/serverTableParams";

/**
 * Filtros del listado de SM en la URL (`?op=82&centro_confeccion=8`), con los
 * nombres de parámetro del backend (`GET /produccion/salidas-maquila/`). Reusa
 * los códecs de las listas en modo servidor solo para LEER y ESCRIBIR la URL,
 * como la bitácora: el endpoint devuelve un arreglo plano sin paginar, así que
 * la lista no usa `useServerTable`.
 *
 * Sin `search` ni `ordering`: el endpoint no busca y su orden es fijo (`-id`).
 * El estatus no va aquí: lo reparten las pestañas sobre lo ya filtrado.
 */
export const SALIDAS_MAQUILA_TABLE = defineServerTable({
  filters: {
    op: positiveIdParam,
    centro_confeccion: positiveIdParam,
  },
});

export type SalidasMaquilaFilterValues = ServerTableFilterValues<(typeof SALIDAS_MAQUILA_TABLE)["filters"]>;

export type SalidasMaquilaFilterKey = keyof SalidasMaquilaFilterValues;
