"use client";

import { STOCK_ITEMS_QUERY_KEY } from "@/src/constants/stockQueryKeys";
import { useServerTable } from "@/src/hooks/useServerTable";
import { limitOffsetAdapter } from "@/src/utils/serverListAdapters";
import {
  defineServerTable,
  enumParam,
  monthParam,
  positiveIdParam,
  textParam,
} from "@/src/utils/serverTableParams";
import type {
  StockEstado,
  StockExistenciasRango,
  StockPorAlmacenItem,
} from "../interfaces/stock-por-almacen.interface";
import { getStockPorAlmacenPage } from "../services/actions";

/** Valores de `?existencias=` (rangos de piezas), en el orden del menú. */
export const STOCK_EXISTENCIAS_RANGOS = [
  "cero",
  "1-10",
  "11-100",
  "mas-100",
] as const satisfies readonly StockExistenciasRango[];

/** Valores de `?estado=`, en el orden del menú. */
export const STOCK_ESTADOS = ["full", "ok", "low", "critical"] as const satisfies readonly StockEstado[];

/**
 * Contrato de la tabla de existencias con `GET /inventarios/existencias/por-almacen/`
 * (nucleo-erp EC-774). El almacén (`?almacen=` en la URL, `almacen_id` en el
 * backend) NO es un filtro de la tabla: lo elige el selector de almacén, va en
 * la llave de la consulta y cambiarlo reinicia todo lo de aquí (ver
 * `StockView`). Así "Limpiar filtros" nunca lo quita.
 *
 * - `nombre`, `tipo` y `color` se comparan EXACTO y distinguiendo mayúsculas
 *   contra el valor crudo de `resumen.opciones` (`textParam` no lo altera).
 * - `ubicacion` es el `id_ubicacion`; `existencias` y `estado`, catálogos
 *   cerrados; `mes`, "AAAA-MM" en hora de México.
 * - `search` busca en nombre y SKU (producto, variante y muestra).
 * - `ordering`: la lista blanca del backend menos `id`, que va como desempate.
 *   El default reproduce el suyo (`-fecha_actualizacion,-id`); el backend deja
 *   los NULL al final en ambos sentidos.
 */
export const stockPorAlmacenTable = defineServerTable({
  filters: {
    nombre: textParam,
    tipo: textParam,
    color: textParam,
    ubicacion: positiveIdParam,
    existencias: enumParam(STOCK_EXISTENCIAS_RANGOS),
    mes: monthParam,
    estado: enumParam(STOCK_ESTADOS),
  },
  search: { param: "search" },
  ordering: {
    fields: ["sku", "nombre", "tipo", "color", "stock", "fecha_actualizacion", "ubicacion_nombre"],
    default: "-fecha_actualizacion",
    tiebreaker: "-id",
  },
});

/**
 * Prefijo de la lista de UN almacén. Cuelga de `STOCK_ITEMS_QUERY_KEY` para
 * que `invalidateStockQueries` la relea tras cualquier movimiento de
 * inventario; el almacén va en el prefijo porque no es un filtro de la tabla.
 */
export const stockPorAlmacenQueryKey = (almacenId: number | null) =>
  [...STOCK_ITEMS_QUERY_KEY, "por-almacen", almacenId] as const;

// A nivel de módulo: una referencia estable entre renders.
const stockPorAlmacenAdapter = limitOffsetAdapter<StockPorAlmacenItem>();

/**
 * Existencias de un almacén en modo servidor (estado en la URL). Con
 * `almacenId` en `null` no consulta: la vista muestra su estado vacío.
 */
export const useStockPorAlmacenTable = (almacenId: number | null) =>
  useServerTable({
    definition: stockPorAlmacenTable,
    queryKey: stockPorAlmacenQueryKey(almacenId),
    queryFn: (params) => getStockPorAlmacenPage(almacenId as number, params),
    adapter: stockPorAlmacenAdapter,
    toastId: "stock-por-almacen-table-refetch-error",
    refetchErrorMessage:
      "No se pudieron actualizar las existencias. Se muestran los datos anteriores.",
    loadErrorMessage:
      "Ocurrió un problema al consultar las existencias del almacén. Intenta de nuevo en unos momentos.",
    enabled: almacenId !== null,
    disabledMessage: "Selecciona un almacén para consultar sus existencias.",
  });
