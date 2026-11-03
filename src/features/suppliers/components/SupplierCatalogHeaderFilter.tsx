"use client";

import type { Column } from "@tanstack/react-table";
import { FilterHeader, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { ALL_FILTER_OPTION } from "@/src/utils/columnFilterOptions";
import { useSuppliers } from "../hooks/useSuppliers";
import type { Supplier } from "../interfaces/supplier.interface";

/**
 * Opciones de un filtro por proveedor salidas del CATÁLOGO (`useSuppliers`,
 * los proveedores activos de la empresa), ordenadas por nombre. El valor es el
 * id en texto, como viaja en `?proveedor=`. La etiqueta lleva el nombre —lo
 * que pintan las columnas `proveedor_nombre`— y la razón social si difiere,
 * para que el buscador encuentre cualquiera de las dos.
 */
export const supplierCatalogOptions = (suppliers: Supplier[]): ColumnFilterOption[] => [
  ALL_FILTER_OPTION,
  ...suppliers
    .map((supplier) => {
      const nombre = supplier.nombre?.trim() ?? "";
      const razonSocial = supplier.razon_social?.trim() ?? "";
      return {
        value: String(supplier.id),
        label:
          nombre && razonSocial && nombre !== razonSocial
            ? `${nombre} (${razonSocial})`
            : nombre || razonSocial || `Proveedor #${supplier.id}`,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "es")),
];

/**
 * Encabezado "título + filtro por proveedor" de una tabla en MODO SERVIDOR
 * cuya columna declara `meta.serverFilter: "proveedor"`. Es un componente (no
 * parte de la factoría de columnas) porque sus opciones salen del catálogo y
 * no de las filas: la tabla solo tiene una página. Un proveedor dado de baja no
 * está en el catálogo; sus órdenes siguen visibles sin filtro.
 */
export function SupplierCatalogHeaderFilter<TData>({
  column,
  title,
}: {
  column: Column<TData, unknown>;
  title: string;
}) {
  const { suppliers, isLoading, isInitialError } = useSuppliers();
  return (
    <FilterHeader
      title={title}
      column={column}
      options={supplierCatalogOptions(suppliers)}
      label="proveedor"
      searchable={{ placeholder: "Buscar proveedor…" }}
      isLoading={isLoading}
      isError={isInitialError}
    />
  );
}
