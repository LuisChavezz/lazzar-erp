"use client";

import { STOCK_ITEMS_QUERY_KEY } from "@/src/constants/stockQueryKeys";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import type { StockPorAlmacenResumen } from "../interfaces/stock-por-almacen.interface";
import { getStockPorAlmacenResumen } from "../services/actions";

/**
 * Llave del resumen de UN almacén. Cuelga de `STOCK_ITEMS_QUERY_KEY` (lo relee
 * `invalidateStockQueries` junto con la lista) pero en una rama propia, fuera
 * del prefijo de la lista (`stockPorAlmacenQueryKey`).
 */
export const stockPorAlmacenResumenQueryKey = (almacenId: number | null) =>
  [...STOCK_ITEMS_QUERY_KEY, "por-almacen-resumen", almacenId] as const;

/**
 * KPIs, `max_stock` y opciones de los filtros de encabezado del almacén
 * completo (`existencias/por-almacen/resumen/`). No depende de filtros ni de
 * la búsqueda, así que una sola consulta por almacén sirve a las tarjetas y a
 * todos los encabezados (TanStack la comparte por llave).
 *
 * Expone el `data` crudo: los consumidores distinguen "aún no cargó" de
 * "cargó". Un refetch fallido conserva los datos y avisa por toast; solo un
 * fallo sin datos (`isInitialError`) se pinta como error.
 */
export const useStockPorAlmacenResumen = (almacenId: number | null) => {
  const { data, isLoading, isInitialError, isFetching, refetch } =
    useGuardedQuery<StockPorAlmacenResumen>(
      {
        queryKey: stockPorAlmacenResumenQueryKey(almacenId),
        queryFn: () => getStockPorAlmacenResumen(almacenId as number),
        enabled: almacenId !== null,
      },
      {
        toastId: "stock-por-almacen-resumen-refetch-error",
        errorMessage: "No se pudieron actualizar los indicadores. Se muestran los datos anteriores.",
      },
    );

  return { data, isLoading, isInitialError, isFetching, refetch };
};
