"use client";

import { useServerTable } from "@/src/hooks/useServerTable";
import { limitOffsetAdapter } from "@/src/utils/serverListAdapters";
import { defineServerTable, enumParam, positiveIdParam } from "@/src/utils/serverTableParams";
import { ESTADO_OPORTUNIDAD_VALUES } from "../constants/opportunityChoices";
import type { Opportunity, OpportunityListResponse } from "../interfaces/opportunity.interface";
import { getOpportunities } from "../services/actions";

/**
 * Prefijo de TODAS las consultas de oportunidades. Las mutaciones invalidan
 * por este prefijo (todas las páginas y filtros) y no escriben la caché de
 * forma optimista: a qué página pertenece un registro depende de los filtros y
 * del orden.
 */
export const OPPORTUNITIES_KEY = ["opportunities"] as const;

/**
 * Contrato del listado con `/ventas/oportunidades/`.
 *
 * - Solo se ordena por campos REALES del modelo. `estado` es calculado y los
 *   nombres de cliente y vendedor salen de otras tablas: el backend ignora en
 *   silencio un `ordering` que no reconoce, así que ofrecerlos ordenaría "sin
 *   hacer nada".
 * - `tiebreaker`: `monto_estimado` y `proximo_contacto` se repiten mucho; sin
 *   el desempate por `id`, las filas empatadas cambiarían de página.
 * - `proximo_contacto_hasta` existe en el endpoint pero no se usa aquí: es de
 *   la agenda de seguimientos.
 */
export const opportunitiesTable = defineServerTable({
  filters: {
    estado: enumParam(ESTADO_OPORTUNIDAD_VALUES),
    cliente: positiveIdParam,
    vendedor: positiveIdParam,
  },
  search: { param: "q" },
  ordering: {
    fields: ["titulo", "monto_estimado", "proximo_contacto", "created_at"],
    default: "-id",
    tiebreaker: "-id",
  },
});

// A nivel de módulo: una referencia estable entre renders.
const opportunitiesAdapter = limitOffsetAdapter<Opportunity>();

/** Listado de oportunidades en modo servidor (estado en la URL). */
export const useOpportunitiesTable = () =>
  useServerTable<typeof opportunitiesTable.filters, OpportunityListResponse, Opportunity>({
    definition: opportunitiesTable,
    queryKey: OPPORTUNITIES_KEY,
    queryFn: getOpportunities,
    adapter: opportunitiesAdapter,
    toastId: "opportunities-refetch-error",
    loadErrorMessage: "No se pudieron cargar las oportunidades.",
  });
