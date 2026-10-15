"use client";

import { DropdownMenu } from "@radix-ui/themes";
import { Button } from "@/src/components/Button";
import { ChevronDownIcon, RefreshIcon } from "@/src/components/Icons";
import { productionOrderStatusEntry } from "@/src/features/production-orders/constants/productionOrderStatus";
import type { ProductionOrderStatusOption } from "../interfaces/production-order-status.interface";

interface ProductionOrderStatusMenuProps {
  /** Destinos del GET `estatus/`. Con la lista vacía el menú no se pinta. */
  options: ProductionOrderStatusOption[];
  /** POST en vuelo: inhabilita el disparador y muestra un spinner. */
  isPending: boolean;
  onSelect: (option: ProductionOrderStatusOption) => void;
}

/**
 * "Cambiar estatus" de la cabecera del detalle de OP. Los destinos son los que
 * calcula el backend; etiqueta y color salen del mapa local
 * (`productionOrderStatusEntry`), con la `etiqueta` del backend de respaldo
 * para un código desconocido. Una opción con requisitos pendientes se sigue
 * ofreciendo (abre el diálogo que los explica), marcada como tal.
 *
 * El menú NO decide nada ni guarda estado: avisa la opción elegida y quien lo
 * monta abre el diálogo que toque. `modal={false}`, como `ActionMenu`: un item
 * que abre un `MainDialog` en el mismo tick en que el menú se cierra dejaba el
 * `body` sin eventos de puntero con el menú modal (radix-ui/primitives#3317).
 */
export function ProductionOrderStatusMenu({
  options,
  isPending,
  onSelect,
}: ProductionOrderStatusMenuProps) {
  if (options.length === 0) return null;

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger>
        <Button variant="secondary" disabled={isPending} aria-busy={isPending}>
          {isPending ? "Cambiando estatus…" : "Cambiar estatus"}
          {isPending ? (
            <RefreshIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <ChevronDownIcon className="w-4 h-4" aria-hidden="true" />
          )}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="end"
        className="bg-white! dark:bg-zinc-900! min-w-52 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 p-1"
      >
        {options.map((option) => {
          const entry = productionOrderStatusEntry(option.estatus_op, option.etiqueta);
          return (
            <DropdownMenu.Item
              key={option.estatus_op}
              onSelect={() => onSelect(option)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer! outline-none data-highlighted:bg-slate-50 dark:data-highlighted:bg-white/5 data-highlighted:text-sky-600 dark:data-highlighted:text-sky-400 transition-colors ease-in-out"
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${entry.dot}`} aria-hidden="true" />
              <span>{entry.label}</span>
              {!option.permitido && (
                <span className="ml-auto pl-3 text-[10px] font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
                  Requisitos pendientes
                </span>
              )}
            </DropdownMenu.Item>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
