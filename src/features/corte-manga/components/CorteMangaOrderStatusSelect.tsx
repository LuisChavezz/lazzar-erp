"use client";

import { InlineSelect } from "@/src/components/InlineSelect";
import { StatusBadge } from "@/src/components/StatusBadge";
import { corteMangaStatusEntry } from "../constants/corteMangaOrderStatus";
import { getAvailableTransitions } from "../constants/corteMangaOrderStatusTransitions";
import type { CorteMangaOrderStatus } from "../interfaces/corte-manga-order.interface";

interface CorteMangaOrderStatusSelectProps {
  /** Estatus actual de la orden (`estatus_corte`, 1-7). */
  currentStatus: CorteMangaOrderStatus;
  /** Etiqueta resuelta por el backend, respaldo del rótulo local. */
  statusDisplay?: string | null;
  /** Se invoca con el nuevo estatus al elegirlo en el menú. */
  onStatusChange: (next: CorteMangaOrderStatus) => void;
  /** PATCH en vuelo: inhabilita el disparador y muestra un spinner. */
  isPending?: boolean;
  /** Sin permiso de edición: degrada al badge de solo lectura. */
  readOnly?: boolean;
}

/**
 * Selector de estatus de una orden de corte de manga, sobre el `InlineSelect`
 * compartido: el disparador es el mismo badge que el resto del módulo.
 *
 * Ofrece los destinos de `getAvailableTransitions` (todos menos el actual y el
 * `7`). En Cancelado no hay destinos y degrada a badge de solo lectura, igual
 * que sin permiso — mismo comportamiento que `EmbroideryStatusSelect`.
 */
export function CorteMangaOrderStatusSelect({
  currentStatus,
  statusDisplay,
  onStatusChange,
  isPending = false,
  readOnly = false,
}: CorteMangaOrderStatusSelectProps) {
  const current = corteMangaStatusEntry(currentStatus, statusDisplay);
  const transitions = getAvailableTransitions(currentStatus);

  if (readOnly || transitions.length === 0) {
    return (
      <StatusBadge status={String(currentStatus)} config={{ [currentStatus]: current }} />
    );
  }

  return (
    <InlineSelect
      options={transitions.map((estatus) => {
        const entry = corteMangaStatusEntry(estatus);
        return { value: String(estatus), label: entry.label ?? String(estatus), dot: entry.dot };
      })}
      onSelect={(value) => {
        const next = transitions.find((estatus) => String(estatus) === value);
        if (next !== undefined) onStatusChange(next);
      }}
      ariaLabel="Cambiar estatus de la orden"
      isPending={isPending}
      triggerClassName={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${current.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dot}`} aria-hidden="true" />
      {current.label}
    </InlineSelect>
  );
}
