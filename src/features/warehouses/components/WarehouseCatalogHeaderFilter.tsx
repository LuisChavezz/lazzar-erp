"use client";

import type { Column } from "@tanstack/react-table";
import { FilterHeader, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { ALL_FILTER_OPTION } from "@/src/utils/columnFilterOptions";
import { useWarehouses } from "../hooks/useWarehouses";
import type { Warehouse } from "../interfaces/warehouse.interface";

/**
 * Opciones de un filtro por almacén salidas del CATÁLOGO (`useWarehouses`),
 * ordenadas por nombre. El valor es el id en texto, como viaja en `?almacen=`.
 */
export const warehouseCatalogOptions = (warehouses: readonly Warehouse[]): ColumnFilterOption[] => [
  ALL_FILTER_OPTION,
  ...warehouses
    .map((warehouse) => ({
      value: String(warehouse.id_almacen),
      label: warehouse.nombre?.trim() || `Almacén #${warehouse.id_almacen}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es")),
];

/**
 * Encabezado "título + filtro por almacén" de una tabla en MODO SERVIDOR cuya
 * columna declara `meta.serverFilter: "almacen"`. Las opciones salen del
 * catálogo y no de las filas: la tabla solo tiene una página.
 */
export function WarehouseCatalogHeaderFilter<TData>({
  column,
  title,
}: {
  column: Column<TData, unknown>;
  title: string;
}) {
  const { data, isLoading, isInitialError } = useWarehouses();
  return (
    <FilterHeader
      title={title}
      column={column}
      options={warehouseCatalogOptions(data ?? [])}
      label="almacén"
      searchable={{ placeholder: "Buscar almacén…" }}
      isLoading={isLoading}
      isError={isInitialError}
    />
  );
}
