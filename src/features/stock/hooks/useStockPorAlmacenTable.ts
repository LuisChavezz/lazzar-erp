"use client";

import { STOCK_ITEMS_QUERY_KEY } from "@/src/constants/stockQueryKeys";
import { useServerTable } from "@/src/hooks/useServerTable";
import { limitOffsetAdapter } from "@/src/utils/serverListAdapters";
import type { StockPorAlmacenItem } from "../interfaces/stock-por-almacen.interface";
import { stockPorAlmacenTable } from "../constants/stockPorAlmacen";
import { getStockPorAlmacenPage } from "../services/actions";

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
