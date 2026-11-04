"use client";

import { createContext, useContext } from "react";
import type { Column } from "@tanstack/react-table";
import { FilterHeader } from "@/src/components/ColumnHeaderFilter";
import { ALL_FILTER_OPTION } from "@/src/utils/columnFilterOptions";
import { useStockPorAlmacenResumen } from "../hooks/useStockPorAlmacenResumen";
import {
  stockResumenFilterOptions,
  type StockResumenOptionKey,
} from "../utils/stockFilterOptions";

/**
 * Almacén que muestra la tabla de existencias. Llega a los encabezados por
 * contexto y no por la factoría de columnas: así las columnas no cambian de
 * identidad al cambiar de almacén.
 */
export const StockAlmacenContext = createContext<number | null>(null);

const ONLY_ALL = [ALL_FILTER_OPTION];

/**
 * Encabezado "título + filtro" de una columna de existencias cuyas opciones
 * salen de `resumen.opciones` del almacén completo, nunca de las filas
 * cargadas (la tabla solo tiene una página). El valor viaja crudo, en texto,
 * como lo espera el filtro del backend (`ubicacion` es un id).
 */
export function StockResumenHeaderFilter<TData>({
  column,
  title,
  optionKey,
  label,
  searchPlaceholder,
}: {
  column: Column<TData, unknown>;
  title: string;
  optionKey: StockResumenOptionKey;
  label: string;
  /** Con placeholder, el menú lleva buscador (catálogos largos). */
  searchPlaceholder?: string;
}) {
  const almacenId = useContext(StockAlmacenContext);
  const { data, isLoading, isInitialError } = useStockPorAlmacenResumen(almacenId);

  const options = data ? stockResumenFilterOptions(data)[optionKey] : ONLY_ALL;

  return (
    <FilterHeader
      title={title}
      column={column}
      options={options}
      label={label}
      searchable={searchPlaceholder ? { placeholder: searchPlaceholder } : undefined}
      isLoading={isLoading}
      isError={isInitialError}
    />
  );
}
