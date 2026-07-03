"use client";

import { DropdownMenu } from "@radix-ui/themes";
import {
  WarehouseIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  LoadingSpinnerIcon,
} from "@/src/components/Icons";
import { useWarehouses } from "@/src/features/warehouses/hooks/useWarehouses";

interface WarehouseFilterProps {
  /** ID del almacén seleccionado, o `null` si aún no se ha elegido ninguno. */
  value: number | null;
  /** Se invoca con el almacén elegido. */
  onChange: (almacenId: number) => void;
}

/**
 * Selector de almacén para filtrar las existencias del lado del servidor.
 * Replica el patrón visual del selector de sucursal del header (`WorkspaceInfo`).
 * Solo lista almacenes individuales: no existe una opción "todos los almacenes",
 * porque el negocio exige elegir siempre un almacén concreto antes de ver datos.
 */
export function WarehouseFilter({ value, onChange }: WarehouseFilterProps) {
  const { data: warehouses = [], isLoading } = useWarehouses();

  const selected =
    value != null ? warehouses.find((w) => w.id_almacen === value) : undefined;

  const label = selected ? selected.nombre : "Selecciona un almacén";

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        Almacén
      </span>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <button
            type="button"
            aria-label={`Almacén: ${label}`}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none transition-colors hover:border-brand-500 hover:bg-white dark:border-slate-700 dark:bg-black/20 dark:text-slate-200 dark:hover:bg-black/40"
          >
            <WarehouseIcon
              className="h-4 w-4 text-sky-500 dark:text-sky-400"
              aria-hidden="true"
            />
            <span className="max-w-44 truncate">{label}</span>
            {isLoading ? (
              <LoadingSpinnerIcon
                className="h-4 w-4 animate-spin text-slate-400"
                aria-hidden="true"
              />
            ) : (
              <ChevronDownIcon
                className="h-3.5 w-3.5 text-slate-400"
                aria-hidden="true"
              />
            )}
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content
          align="start"
          className="max-h-72 overflow-y-auto bg-white! dark:bg-zinc-900! dark:text-white!"
        >
          {warehouses.map((w) => (
            <DropdownMenu.Item
              key={w.id_almacen}
              onClick={() => onChange(w.id_almacen)}
              className="flex min-w-52 cursor-pointer! items-center justify-between gap-3"
            >
              <span
                className={`text-xs ${value === w.id_almacen ? "font-bold" : "font-medium"}`}
              >
                {w.nombre}
              </span>
              {value === w.id_almacen && (
                <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
              )}
            </DropdownMenu.Item>
          ))}

          {!isLoading && warehouses.length === 0 && (
            <DropdownMenu.Item disabled className="text-xs">
              <span className="text-xs font-medium text-slate-400">
                No hay almacenes disponibles
              </span>
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}
