import {
  defineServerTable,
  enumParam,
  positiveIdParam,
  type ServerTableFilterValues,
} from "@/src/utils/serverTableParams";
import { SALIDA_MAQUILA_ORIGEN_VALUES } from "./salidaMaquilaOrigen";

/**
 * Filtros del listado de SM en la URL (`?origen=OB&centro_confeccion=8`), con los
 * nombres de parámetro del backend (`GET /produccion/salidas-maquila/`). Reusa
 * los códecs de las listas en modo servidor solo para LEER y ESCRIBIR la URL,
 * como la bitácora: el endpoint devuelve un arreglo plano sin paginar, así que
 * la lista no usa `useServerTable`.
 *
 * Sin `search` ni `ordering`: el endpoint no busca y su orden es fijo (`-id`).
 * El estatus no va aquí: lo reparten las pestañas sobre lo ya filtrado.
 *
 * `origen` (OP/OB/OR) y la orden concreta (`op`, `ob`, `orden_r`; EC-911). La
 * OP se elige del catálogo de OP; `ob` y `orden_r` solo se leen de la URL (sus
 * catálogos piden `R-PRODUCCION-OB`/`-OR`, que quien ve SM puede no tener).
 */
export const SALIDAS_MAQUILA_TABLE = defineServerTable({
  filters: {
    origen: enumParam(SALIDA_MAQUILA_ORIGEN_VALUES),
    op: positiveIdParam,
    ob: positiveIdParam,
    orden_r: positiveIdParam,
    centro_confeccion: positiveIdParam,
  },
});

export type SalidasMaquilaFilterValues = ServerTableFilterValues<(typeof SALIDAS_MAQUILA_TABLE)["filters"]>;

export type SalidasMaquilaFilterKey = keyof SalidasMaquilaFilterValues;
