"use client";

import type { Column } from "@tanstack/react-table";
import { FilterHeader, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { ALL_FILTER_OPTION } from "@/src/utils/columnFilterOptions";
import type { WmsOrdersTab } from "../constants/wmsOrdersTables";
import { useWmsOrdersFiltros } from "../hooks/useWmsOrdersTables";

/**
 * Filtro de encabezado de Pedidos de Almacén cuyas opciones salen de
 * `surtido-pedidos/filtros/` del conjunto de la pestaña, NUNCA de las filas (la
 * tabla solo tiene la página actual). Sin opción "Sin cliente": el backend no
 * filtra pedidos sin cliente (EC-993).
 */
export function WmsOrdersCatalogHeader<TData>({
  column,
  tab,
  catalogo,
  title,
  label,
  searchable = false,
}: {
  column: Column<TData, unknown>;
  tab: WmsOrdersTab;
  catalogo: "clientes" | "sucursales";
  title: string;
  label: string;
  searchable?: boolean;
}) {
  const { data, isLoading, isInitialError } = useWmsOrdersFiltros(tab);
  const options: ColumnFilterOption[] = [
    ALL_FILTER_OPTION,
    ...(data?.[catalogo] ?? []).map((o) => ({ value: String(o.id), label: o.nombre || `#${o.id}` })),
  ];
  return (
    <FilterHeader
      title={title}
      column={column}
      options={options}
      label={label}
      searchable={searchable ? { placeholder: `Buscar ${label}…` } : undefined}
      isLoading={isLoading}
      isError={isInitialError}
    />
  );
}
