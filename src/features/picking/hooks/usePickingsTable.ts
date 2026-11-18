"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { useServerTable } from "@/src/hooks/useServerTable";
import { limitOffsetAdapter } from "@/src/utils/serverListAdapters";
import { PICKINGS_QUERY_KEY, pickingKpisQueryKey } from "../constants/pickingQueryKeys";
import { getPickingKpis, getPickingsPage } from "../services/actions";
import type { PickingListItem } from "../interfaces/picking.interface";
import { pickingsTable, toPickingKpisParams } from "../utils/pickingList";

// A nivel de módulo: una referencia estable entre renders.
const pickingsAdapter = limitOffsetAdapter<PickingListItem>();

/**
 * Listado de pickings en MODO SERVIDOR (`?resumen=1`, paginado): filtros,
 * búsqueda, orden y página viven en la URL, así que la página que lo monta lo
 * envuelve en `<Suspense>`.
 */
export const usePickingsTable = () =>
  useServerTable({
    definition: pickingsTable,
    queryKey: PICKINGS_QUERY_KEY,
    queryFn: getPickingsPage,
    adapter: pickingsAdapter,
    toastId: "pickings-table-refetch-error",
    refetchErrorMessage: "No se pudieron actualizar los surtidos. Se muestran los datos anteriores.",
    loadErrorMessage: "No se pudieron cargar los surtidos.",
  });

/**
 * Indicadores del listado (`GET /wms/pickings/kpis/`) del MISMO conjunto que
 * la tabla: recibe sus `criteria` (filtros y búsqueda; el backend descarta el
 * orden). Mientras llegan los de criterios nuevos se conservan los anteriores
 * (`keepPreviousData`), igual que las filas de la tabla. La llave cuelga de
 * `["pickings"]`, así que las mutaciones y "Actualizar datos" los refrescan
 * junto con la tabla.
 */
export const usePickingKpis = (criteria: Readonly<Record<string, string>>) => {
  const params = toPickingKpisParams(criteria);
  return useGuardedQuery(
    {
      queryKey: pickingKpisQueryKey(params),
      queryFn: () => getPickingKpis(params),
      placeholderData: keepPreviousData,
    },
    {
      toastId: "picking-kpis-refetch-error",
      errorMessage: "No se pudieron actualizar los indicadores. Se muestran los datos anteriores.",
    },
  );
};
