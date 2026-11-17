"use client";

import { useEffect, useEffectEvent } from "react";
import { useServerTable } from "@/src/hooks/useServerTable";
import { useCompanyAdminStatus } from "@/src/features/users/hooks/useIsCompanyAdmin";
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
 * - Solo se ordena por lo que el backend acepta: el backend ignora en silencio
 *   un `ordering` que no reconoce, así que ofrecer otro ordenaría "sin hacer
 *   nada". `estado` es calculado y el nombre del vendedor no está en su lista.
 *   `cliente__razon_social` (EC-902) ordena por la etiqueta que se pinta (la
 *   razón social o, en blanco, el nombre), y un cliente que el usuario no ve
 *   ordena como si no hubiera cliente (`NULL`).
 * - `q` busca en título, contacto y —si el usuario ve a ese cliente— en el
 *   nombre y la razón social del cliente.
 * - `tiebreaker`: cliente, `monto_estimado` y `proximo_contacto` se repiten mucho; sin
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
    fields: ["titulo", "cliente__razon_social", "monto_estimado", "proximo_contacto", "created_at"],
    default: "-id",
    tiebreaker: "-id",
  },
});

// A nivel de módulo: una referencia estable entre renders.
const opportunitiesAdapter = limitOffsetAdapter<Opportunity>();

/** Listado de oportunidades en modo servidor (estado en la URL). */
export const useOpportunitiesTable = () => {
  const table = useServerTable<typeof opportunitiesTable.filters, OpportunityListResponse, Opportunity>({
    definition: opportunitiesTable,
    queryKey: OPPORTUNITIES_KEY,
    queryFn: getOpportunities,
    adapter: opportunitiesAdapter,
    toastId: "opportunities-refetch-error",
    loadErrorMessage: "No se pudieron cargar las oportunidades.",
    // Como el embudo que va encima (`useOpportunitiesEmbudo`): el `estado`
    // cambia desde pantallas que no invalidan estas llaves, y la tabla y el
    // embudo deben mostrar el mismo momento al volver a la página.
    refetchOnMount: "always",
  });

  // Un vendedor no ve el filtro de vendedor (el backend solo le devuelve sus
  // oportunidades). Si llega con `?vendedor=N` en la URL, el filtro quedaría
  // activo sin control a la vista: se quita por la misma vía que cualquier
  // filtro (`setFilter`, que vuelve a la página 1 y conserva lo demás).
  //
  // Solo con la respuesta RESUELTA (`not-admin`): mientras la sesión carga, o
  // si es anterior a que guardara ese dato (`unknown`), el parámetro se queda —
  // a un administrador no se le debe quitar su filtro por no saberlo aún.
  const adminStatus = useCompanyAdminStatus();
  const hasVendedorFilter = table.state.filters.vendedor !== undefined;
  const dropVendedorFilter = useEffectEvent(() => table.setFilter("vendedor", undefined));
  useEffect(() => {
    if (adminStatus === "not-admin" && hasVendedorFilter) dropVendedorFilter();
  }, [adminStatus, hasVendedorFilter]);

  return table;
};
