"use client";

import { InlineSelect } from "@/src/components/InlineSelect";
import { StatusBadge, type StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import { WORK_ORDER_PRIORITY_CODES } from "@/src/utils/workOrderStatusEdit";

interface WorkOrderPrioritySelectProps {
  /** Prioridad actual (`prioridad`; el modelo no la restringe a 1-3). */
  value: number;
  /** Etiquetas y colores de 1-3, de la config propia del módulo. */
  config: Record<string, StatusBadgeConfigEntry>;
  /** Badge para una prioridad fuera de 1-3. */
  fallback: (prioridad: number) => StatusBadgeConfigEntry;
  onChange: (prioridad: number) => void;
  /** PATCH en vuelo: inhabilita el disparador y muestra un spinner. */
  isPending?: boolean;
  /** Sin permiso u orden cancelada: badge de solo lectura. */
  readOnly?: boolean;
}

/**
 * Selector CERRADO de prioridad de una orden de reflejante o de corte de
 * manga: solo 1 Alta / 2 Media / 3 Baja, las únicas que acepta el `PATCH`
 * (nucleo-erp #786). El alta no las valida, así que un valor fuera de 1-3
 * (histórico o escrito por otra vía) se sigue pintando con su badge neutro y
 * puede corregirse eligiendo uno de los tres. Cambiar otro campo no lo
 * reenvía: cada `PATCH` lleva solo lo que cambia.
 */
export function WorkOrderPrioritySelect({
  value,
  config,
  fallback,
  onChange,
  isPending = false,
  readOnly = false,
}: WorkOrderPrioritySelectProps) {
  const current = config[value] ?? fallback(value);

  if (readOnly) {
    return <StatusBadge status={String(value)} config={{ [value]: current }} />;
  }

  return (
    <InlineSelect
      options={WORK_ORDER_PRIORITY_CODES.filter((codigo) => codigo !== value).map((codigo) => ({
        value: String(codigo),
        label: config[codigo]?.label ?? String(codigo),
        dot: config[codigo]?.dot,
      }))}
      onSelect={(next) => onChange(Number(next))}
      ariaLabel="Cambiar prioridad de la orden"
      isPending={isPending}
      triggerClassName={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${current.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dot}`} aria-hidden="true" />
      {current.label}
    </InlineSelect>
  );
}
