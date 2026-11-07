"use client";

import type { Column } from "@tanstack/react-table";
import { FilterHeader, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { ALL_FILTER_OPTION, optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { QUOTE_STATUS_CONFIG } from "../constants/quoteStatus";
import { useQuoteFilterOptions } from "../hooks/useQuotesTable";
import { buildQuoteClienteFilterOptions } from "../utils/quoteFilterOptions";

/**
 * Encabezados con filtro del listado de cotizaciones en MODO SERVIDOR. Cada
 * columna declara la clave en `meta.serverFilter`; aquí solo se pintan las
 * opciones, FIJAS (el catálogo de estatus de EC-751) o del catálogo
 * `opciones/` (todo lo visible), nunca de las filas: la tabla solo tiene la
 * página actual.
 */

type QuoteColumn<TData> = Column<TData, unknown>;

/** El catálogo completo de estatus en el orden del tablero, con su punto. */
const ESTATUS_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  ...optionsFromConfig(QUOTE_STATUS_CONFIG),
];

export function QuoteEstatusHeaderFilter<TData>({
  column,
  title,
}: {
  column: QuoteColumn<TData>;
  title: string;
}) {
  return <FilterHeader title={title} column={column} options={ESTATUS_OPTIONS} label="estatus" />;
}

/** Cliente (`?cliente=<id>` o `sin_cliente`), con buscador: el catálogo es largo. */
export function QuoteClienteHeaderFilter<TData>({
  column,
  title,
}: {
  column: QuoteColumn<TData>;
  title: string;
}) {
  const { data, isLoading, isInitialError } = useQuoteFilterOptions();
  return (
    <FilterHeader
      title={title}
      column={column}
      options={[ALL_FILTER_OPTION, ...buildQuoteClienteFilterOptions(data?.cliente ?? [])]}
      label="cliente"
      searchable={{ placeholder: "Buscar cliente…" }}
      isLoading={isLoading}
      isError={isInitialError}
    />
  );
}
