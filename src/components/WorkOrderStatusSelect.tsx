"use client";

import { InlineSelect } from "@/src/components/InlineSelect";
import { StatusBadge, type StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import { getWorkOrderTransitions, type WorkOrderStatus } from "@/src/utils/workOrderStatusEdit";

interface WorkOrderStatusSelectProps<S extends WorkOrderStatus> {
  /** Estatus actual de la orden (1-7). */
  currentStatus: S;
  /** Etiqueta resuelta por el backend, respaldo del rótulo local. */
  statusDisplay?: string | null;
  /**
   * Color y etiqueta de cada estatus, de la config propia del módulo: los enums
   * de reflejante y corte de manga solo difieren en la etiqueta del `3`.
   */
  statusEntry: (estatus: S, display?: string | null) => StatusBadgeConfigEntry;
  /** Se invoca con el nuevo estatus al elegirlo en el menú. */
  onStatusChange: (next: S) => void;
  /** PATCH en vuelo: inhabilita el disparador y muestra un spinner. */
  isPending?: boolean;
  /** Sin permiso de edición: degrada al badge de solo lectura. */
  readOnly?: boolean;
}

/**
 * Selector de estatus de una orden de reflejante o de corte de manga, sobre el
 * `InlineSelect` compartido: el disparador es el mismo badge que el resto del
 * módulo.
 *
 * Ofrece los destinos de `getWorkOrderTransitions` (todos menos el actual y el
 * `7`). En Cancelado no hay destinos y degrada a badge de solo lectura, igual
 * que sin permiso — mismo comportamiento que `EmbroideryStatusSelect`.
 */
export function WorkOrderStatusSelect<S extends WorkOrderStatus>({
  currentStatus,
  statusDisplay,
  statusEntry,
  onStatusChange,
  isPending = false,
  readOnly = false,
}: WorkOrderStatusSelectProps<S>) {
  const current = statusEntry(currentStatus, statusDisplay);
  // El enum de cada módulo es exactamente 1-7, así que los destinos comunes son
  // valores de su tipo.
  const transitions = getWorkOrderTransitions(currentStatus) as S[];

  if (readOnly || transitions.length === 0) {
    return (
      <StatusBadge status={String(currentStatus)} config={{ [currentStatus]: current }} />
    );
  }

  return (
    <InlineSelect
      options={transitions.map((estatus) => {
        const entry = statusEntry(estatus);
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
