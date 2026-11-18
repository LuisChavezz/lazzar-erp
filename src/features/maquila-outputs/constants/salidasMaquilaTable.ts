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
 * `origen` (OP/OB/OR, EC-911) y la OP concreta. Sin `ob` ni `orden_r`: nada
 * enlaza al listado con ellos y sus catálogos piden `R-PRODUCCION-OB`/`-OR`,
 * que quien ve SM puede no tener; las SM de una OB u OR se ven en su detalle.
 */
export const SALIDAS_MAQUILA_TABLE = defineServerTable({
  filters: {
    origen: enumParam(SALIDA_MAQUILA_ORIGEN_VALUES),
    op: positiveIdParam,
    centro_confeccion: positiveIdParam,
  },
});

export type SalidasMaquilaFilterValues = ServerTableFilterValues<(typeof SALIDAS_MAQUILA_TABLE)["filters"]>;

export type SalidasMaquilaFilterKey = keyof SalidasMaquilaFilterValues;
