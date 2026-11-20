"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { useServerTable } from "@/src/hooks/useServerTable";
import { limitOffsetAdapter } from "@/src/utils/serverListAdapters";
import { PICKINGS_KEY, pickingsTable } from "../constants/pickingsTable";
import type { PickingListItem } from "../interfaces/picking.interface";
import { getPickingsFiltros, getPickingsPage, getPickingsResumen } from "../services/actions";

// A nivel de módulo: una referencia estable entre renders.
const pickingsAdapter = limitOffsetAdapter<PickingListItem>();

/**
 * Surtidos en MODO SERVIDOR: filtros, búsqueda, orden y página en la URL; la
 * página que lo monta lo envuelve en `<Suspense>`. Consulta bajo
 * `["pickings", "list", params]`, así que invalidar `["pickings"]` (alta,
 * traslado) refresca lista, resumen y filtros.
 */
export const usePickingsTable = () =>
  useServerTable({
    definition: pickingsTable,
    queryKey: PICKINGS_KEY,
    queryFn: getPickingsPage,
    adapter: pickingsAdapter,
    toastId: "pickings-table-refetch-error",
    refetchErrorMessage: "No se pudieron actualizar los surtidos. Se muestran los datos anteriores.",
    loadErrorMessage: "No se pudieron cargar los surtidos.",
  });

/** KPIs del conjunto filtrado: mismos criterios que la lista, sin paginación. */
export const usePickingsResumen = (criteria: Record<string, string>) =>
  useGuardedQuery(
    {
      queryKey: [...PICKINGS_KEY, "resumen", criteria],
      queryFn: () => getPickingsResumen(criteria),
      // Al cambiar de filtro, los números anteriores se quedan hasta que llegan los nuevos.
      placeholderData: keepPreviousData,
    },
    { toastId: "pickings-resumen-refetch-error" },
  );

/** Clientes y operadores con surtidos, para los filtros de encabezado. */
export const usePickingsFiltros = () =>
  useGuardedQuery(
    { queryKey: [...PICKINGS_KEY, "filtros"], queryFn: getPickingsFiltros },
    { toastId: "pickings-filtros-refetch-error" },
  );
