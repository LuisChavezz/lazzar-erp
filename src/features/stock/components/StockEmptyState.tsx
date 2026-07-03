"use client";

import { WarehouseIcon } from "@/src/components/Icons";
import { ErrorState } from "@/src/components/ErrorState";
import { useWarehouses } from "@/src/features/warehouses/hooks/useWarehouses";
import { WarehouseFilter } from "./WarehouseFilter";

interface StockEmptyStateProps {
  /** Almacén actualmente seleccionado (siempre `null` en este estado). */
  almacenId: number | null;
  /** Se invoca con el almacén elegido desde el selector embebido. */
  onSelect: (almacenId: number) => void;
}

/**
 * Estado vacío de existencias: se muestra mientras no hay un almacén
 * seleccionado en la URL. Incluye el propio selector de almacén para que el
 * usuario pueda elegir uno directamente desde aquí. No se consulta la API de
 * existencias ni se renderizan KPIs/tabla hasta que se elige un almacén.
 */
export function StockEmptyState({ almacenId, onSelect }: StockEmptyStateProps) {
  // `data` solo se define tras una carga exitosa de almacenes: distingue
  // "cargó vacío" (mostrar aviso legítimo) de "falló la carga" (mostrar error
  // con reintento), siguiendo el mismo patrón `hasLoaded` de `useInvoices`.
  const { data: warehouses, isError, error, refetch } = useWarehouses();
  const hasLoaded = warehouses !== undefined;
  const hasNoWarehouses = hasLoaded && warehouses.length === 0;

  if (isError) {
    return (
      <div className="space-y-3">
        <ErrorState
          title="No se pudieron cargar los almacenes"
          message={(error as Error)?.message}
        />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (hasNoWarehouses) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-16 text-center dark:border-slate-700 dark:bg-white/[0.02]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
          <WarehouseIcon className="h-8 w-8" aria-hidden="true" />
        </div>
        <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
          No hay almacenes configurados
        </p>
        <p className="mx-auto max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Configura al menos un almacén para poder consultar existencias.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-16 text-center dark:border-slate-700 dark:bg-white/[0.02]">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-500 dark:bg-sky-500/10 dark:text-sky-400">
        <WarehouseIcon className="h-8 w-8" aria-hidden="true" />
      </div>

      <div className="space-y-1">
        <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
          Selecciona un almacén para ver las existencias
        </p>
        <p className="mx-auto max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Elige un almacén para consultar sus existencias, KPIs y niveles de
          stock. No se muestran datos combinados de todos los almacenes.
        </p>
      </div>

      <WarehouseFilter value={almacenId} onChange={onSelect} />
    </div>
  );
}
