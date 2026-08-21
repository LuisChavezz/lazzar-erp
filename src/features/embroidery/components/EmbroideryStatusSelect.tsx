"use client";

import { DropdownMenu } from "@radix-ui/themes";
import { ChevronDownIcon, RefreshIcon } from "@/src/components/Icons";
import { embroideryStatusEntry } from "../constants/embroideryStatus";
import { getAvailableTransitions } from "../constants/embroideryStatusTransitions";
import type { EmbroideryOrderStatus } from "../interfaces/embroidery.interface";

interface EmbroideryStatusSelectProps {
  /** Estatus actual de la orden (`estatus_bordado`, 1-8). */
  currentStatus: EmbroideryOrderStatus;
  /** Etiqueta resuelta por el backend, respaldo del rótulo local. */
  statusDisplay?: string | null;
  /** Se invoca con el nuevo estatus al elegir una transición del menú. */
  onStatusChange: (next: EmbroideryOrderStatus) => void;
  /** PATCH en vuelo: inhabilita el disparador y muestra un spinner. */
  isPending?: boolean;
}

/**
 * Selector de transición de estatus de una orden de bordado.
 *
 * Ofrece los estatus a los que la orden puede moverse según
 * `getAvailableTransitions` —hoy, todos menos el suyo y el 8 (Cancelado
 * legacy)—. En un estatus terminal (sin transiciones: Finalizado o Cancelado
 * legacy) degrada a un badge de solo lectura, sin disparador.
 *
 * El color y la etiqueta de cada estatus salen de `embroideryStatusEntry` —la
 * misma fuente que el resto del módulo—, no se duplican aquí. Construido sobre
 * el `DropdownMenu` de Radix Themes, mismo patrón visual que `ActionMenu`.
 */
export function EmbroideryStatusSelect({
  currentStatus,
  statusDisplay,
  onStatusChange,
  isPending = false,
}: EmbroideryStatusSelectProps) {
  const current = embroideryStatusEntry(currentStatus, statusDisplay);
  const transitions = getAvailableTransitions(currentStatus);

  const badgeContent = (
    <>
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dot}`}
        aria-hidden="true"
      />
      {current.label}
    </>
  );

  // Estatus terminal: badge de solo lectura (no hay a dónde moverse).
  if (transitions.length === 0) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${current.cls}`}
      >
        {badgeContent}
      </span>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button
          type="button"
          disabled={isPending}
          aria-label="Cambiar estatus de la orden"
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-wait ${current.cls}`}
        >
          {badgeContent}
          {isPending ? (
            <RefreshIcon className="w-3 h-3 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <ChevronDownIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="start"
        className="bg-white! dark:bg-zinc-900! min-w-44 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 p-1"
      >
        {transitions.map((next) => {
          const entry = embroideryStatusEntry(next);
          return (
            <DropdownMenu.Item
              key={next}
              onSelect={() => onStatusChange(next)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer! outline-none data-highlighted:bg-slate-50 dark:data-highlighted:bg-white/5 data-highlighted:text-sky-600 dark:data-highlighted:text-sky-400 transition-colors ease-in-out"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${entry.dot}`}
                aria-hidden="true"
              />
              <span>{entry.label}</span>
            </DropdownMenu.Item>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
