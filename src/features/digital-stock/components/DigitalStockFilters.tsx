"use client";

import { FormSelect } from "@/src/components/FormSelect";
import { QuickFilterChips } from "@/src/components/QuickFilterChips";
import type { Branch } from "@/src/features/branches/interfaces/branch.interface";
import {
  DIGITAL_STOCK_SOLO_ALL,
  DIGITAL_STOCK_SOLO_CHIPS,
  DIGITAL_STOCK_SOLO_VALUES,
  type DigitalStockFilterKey,
  type DigitalStockFilterValues,
  type DigitalStockSoloValue,
} from "../constants/digitalStockTable";

const OPTION_CLS = "text-slate-900 dark:text-white bg-white dark:bg-zinc-900";

const isSoloValue = (value: string): value is DigitalStockSoloValue =>
  (DIGITAL_STOCK_SOLO_VALUES as readonly string[]).includes(value);

const CHIPS = [
  { key: DIGITAL_STOCK_SOLO_ALL, label: "Todos", dotClassName: "bg-slate-400" },
  ...DIGITAL_STOCK_SOLO_CHIPS.map(({ value, label, dotClassName }) => ({
    key: value,
    label,
    dotClassName,
  })),
];

interface DigitalStockFiltersProps {
  filters: DigitalStockFilterValues;
  setFilter: <K extends DigitalStockFilterKey>(
    key: K,
    value: DigitalStockFilterValues[K] | undefined,
  ) => void;
  branches: Branch[];
  isBranchesLoading: boolean;
  /** Hay filtros o búsqueda activos (`hasActiveCriteria` de la tabla). */
  hasActiveFilters: boolean;
  /** Vuelve a la vista por defecto: sin filtros ni búsqueda, página 1. */
  onClearFilters: () => void;
}

/**
 * Filtros del stock digital fuera de la tabla: atajos de `?solo=` y sucursal.
 * Todos son del SERVIDOR: cada cambio reescribe la URL y la lista vuelve a la
 * página 1. La búsqueda vive en la barra de la tabla y categoría, color y talla
 * en los encabezados de sus columnas. Los atajos no llevan conteo: el endpoint
 * no lo devuelve.
 */
export function DigitalStockFilters({
  filters,
  setFilter,
  branches,
  isBranchesLoading,
  hasActiveFilters,
  onClearFilters,
}: DigitalStockFiltersProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <QuickFilterChips
        label="Mostrar solo"
        chips={CHIPS}
        value={filters.solo ?? DIGITAL_STOCK_SOLO_ALL}
        onChange={(key) => setFilter("solo", isSoloValue(key) ? key : undefined)}
      />

      <div className="flex items-end gap-4">
        <div className="w-full sm:w-64">
          <FormSelect
            label="Sucursal"
            value={filters.sucursal !== undefined ? String(filters.sucursal) : ""}
            disabled={isBranchesLoading}
            onChange={(event) => {
              const id = Number(event.target.value);
              setFilter("sucursal", Number.isInteger(id) && id > 0 ? id : undefined);
            }}
          >
            <option value="" className={OPTION_CLS}>
              Todas las sucursales
            </option>
            {/* Una sucursal de la URL que el catálogo no trae se conserva como
                opción para que el select no aparente "Todas". */}
            {filters.sucursal !== undefined &&
              !branches.some((branch) => branch.id === filters.sucursal) && (
                <option value={String(filters.sucursal)} className={OPTION_CLS}>
                  Sucursal #{filters.sucursal}
                </option>
              )}
            {branches.map((branch) => (
              <option key={branch.id} value={String(branch.id)} className={OPTION_CLS}>
                {branch.nombre}
              </option>
            ))}
          </FormSelect>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mb-3 shrink-0 text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
