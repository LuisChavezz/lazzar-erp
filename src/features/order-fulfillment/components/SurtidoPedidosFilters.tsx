"use client";

import { FormSelect } from "@/src/components/FormSelect";
import type { Branch } from "@/src/features/branches/interfaces/branch.interface";
import {
  SURTIDO_ESTATUS_DEFAULT_LABEL,
  SURTIDO_ESTATUS_LABELS,
  SURTIDO_ESTATUS_VALUES,
  type SurtidoEstatusValue,
  type SurtidoPedidosFilterKey,
  type SurtidoPedidosFilterValues,
} from "../constants/surtidoPedidosTable";

const OPTION_CLS = "text-slate-900 dark:text-white bg-white dark:bg-zinc-900";

const isSurtidoEstatus = (value: string): value is SurtidoEstatusValue =>
  (SURTIDO_ESTATUS_VALUES as readonly string[]).includes(value);

interface SurtidoPedidosFiltersProps {
  filters: SurtidoPedidosFilterValues;
  setFilter: <K extends SurtidoPedidosFilterKey>(
    key: K,
    value: SurtidoPedidosFilterValues[K] | undefined,
  ) => void;
  branches: Branch[];
  isBranchesLoading: boolean;
}

/**
 * Filtros del avance de surtido. Todos son del SERVIDOR: cada cambio reescribe
 * la URL (`useSurtidoPedidosTable`) y la lista vuelve a la página 1. La
 * búsqueda (folio o cliente) vive en la barra de la tabla.
 */
export function SurtidoPedidosFilters({
  filters,
  setFilter,
  branches,
  isBranchesLoading,
}: SurtidoPedidosFiltersProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <FormSelect
        label="Estatus del pedido"
        value={filters.estatus ?? ""}
        onChange={(event) =>
          setFilter(
            "estatus",
            isSurtidoEstatus(event.target.value) ? event.target.value : undefined,
          )
        }
      >
        <option value="" className={OPTION_CLS}>
          {SURTIDO_ESTATUS_DEFAULT_LABEL}
        </option>
        {SURTIDO_ESTATUS_VALUES.map((value) => (
          <option key={value} value={value} className={OPTION_CLS}>
            {SURTIDO_ESTATUS_LABELS[value]}
          </option>
        ))}
      </FormSelect>

      <FormSelect
        label="Comprometido"
        value={filters.pendientes ? "true" : ""}
        onChange={(event) =>
          setFilter("pendientes", event.target.value === "true" ? true : undefined)
        }
      >
        <option value="" className={OPTION_CLS}>
          Todos los pedidos
        </option>
        <option value="true" className={OPTION_CLS}>
          Solo con piezas comprometidas
        </option>
      </FormSelect>

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
  );
}
