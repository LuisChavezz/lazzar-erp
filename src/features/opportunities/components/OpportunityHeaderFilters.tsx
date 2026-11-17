"use client";

import type { Column } from "@tanstack/react-table";
import { ColumnHeaderFilter } from "@/src/components/ColumnHeaderFilter";
import { useCustomers } from "@/src/features/customers/hooks/useCustomers";
import { useIsCompanyAdmin } from "@/src/features/users/hooks/useIsCompanyAdmin";
import { useUsers } from "@/src/features/users/hooks/useUsers";
import type { Opportunity } from "../interfaces/opportunity.interface";
import {
  OPPORTUNITY_ESTADO_FILTER_OPTIONS,
  buildOpportunityClienteFilterOptions,
  sortOpportunityCatalogOptions,
} from "../utils/opportunityFilterOptions";

/**
 * Encabezados con filtro de la tabla de oportunidades. Son componentes (y no
 * parte de la factoría de columnas) porque las opciones de cliente y vendedor
 * salen de un CATÁLOGO: la tabla solo tiene una página, así que nunca se
 * derivan de las filas cargadas. Las opciones las arma
 * `opportunityFilterOptions`.
 */

type OpportunityColumn = Column<Opportunity, unknown>;

/**
 * Encabezado de la columna "Oportunidad": su etiqueta y el filtro de ESTADO
 * (la columna pinta el estado como badge bajo el título, sin columna propia).
 * Cada opción lleva el punto de color de su badge (`optionsFromConfig`).
 */
export function OpportunityTituloHeader({ column }: { column: OpportunityColumn }) {
  return (
    <div className="flex items-center gap-1.5">
      <span>Oportunidad</span>
      <ColumnHeaderFilter column={column} options={OPPORTUNITY_ESTADO_FILTER_OPTIONS} label="estado" />
    </div>
  );
}

export function OpportunityClienteHeader({ column }: { column: OpportunityColumn }) {
  const { customers, isLoading, isInitialError } = useCustomers();
  // Rotuladas como la celda: razón social (EC-810).
  const options = buildOpportunityClienteFilterOptions(customers);

  return (
    <div className="flex items-center gap-1.5">
      <span>Cliente</span>
      <ColumnHeaderFilter
        column={column}
        options={options}
        label="cliente"
        searchable={{ placeholder: "Buscar cliente…" }}
        isLoading={isLoading}
        isError={isInitialError}
      />
    </div>
  );
}

/**
 * El filtro solo se pinta para quien puede ver oportunidades de otros
 * (`useIsCompanyAdmin`, que falla cerrado): a un vendedor el backend le
 * devuelve solo las suyas, así que el filtro no le serviría de nada.
 *
 * El catálogo de usuarios (`/usuarios/`, lento) lo pide el componente del
 * filtro, que solo se monta para un administrador: un vendedor nunca lo carga.
 */
export function OpportunityVendedorHeader({ column }: { column: OpportunityColumn }) {
  const canSeeOthers = useIsCompanyAdmin();
  return canSeeOthers ? <VendedorFilterHeader column={column} /> : <span>Vendedor</span>;
}

function VendedorFilterHeader({ column }: { column: OpportunityColumn }) {
  const { data: users, isLoading, isError } = useUsers();

  const options = sortOpportunityCatalogOptions(
    (users ?? []).map((user) => ({
      value: String(user.id),
      label: user.nombre_completo?.trim() || user.email || user.username,
      active: user.is_active,
    }))
  );

  return (
    <div className="flex items-center gap-1.5">
      <span>Vendedor</span>
      <ColumnHeaderFilter
        column={column}
        options={options}
        label="vendedor"
        searchable={{ placeholder: "Buscar vendedor…" }}
        isLoading={isLoading}
        // Solo si el catálogo nunca cargó: un refetch fallido conserva `data`.
        isError={isError && !users}
      />
    </div>
  );
}
