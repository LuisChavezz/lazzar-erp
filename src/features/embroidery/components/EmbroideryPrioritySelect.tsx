"use client";

import {
  EMBROIDERY_PRIORITY_CONFIG,
  embroideryPriorityFallback,
} from "../constants/embroideryStatus";
import { EmbroideryInlineSelect } from "./EmbroideryInlineSelect";

/**
 * Prioridades que ofrece la UI. El backend declara `prioridad` como
 * `IntegerField(default=1)` SIN `choices`, así que 1/2/3 (Alta/Media/Baja) es
 * una convención de PRESENTACIÓN — la misma que ya usan el alta de bordado y
 * la de órdenes de producción. Una orden con un entero fuera de ese rango
 * muestra su badge neutro en el disparador y puede normalizarse eligiendo una
 * de estas tres.
 */
const PRIORITY_VALUES = [1, 2, 3];

interface EmbroideryPrioritySelectProps {
  prioridad: number;
  onPriorityChange: (next: number) => void;
  isPending?: boolean;
}

/** Selector inline de la prioridad de la orden. */
export function EmbroideryPrioritySelect({
  prioridad,
  onPriorityChange,
  isPending = false,
}: EmbroideryPrioritySelectProps) {
  const current =
    EMBROIDERY_PRIORITY_CONFIG[String(prioridad)] ??
    embroideryPriorityFallback(prioridad);

  const options = PRIORITY_VALUES.map((value) => {
    const entry = EMBROIDERY_PRIORITY_CONFIG[String(value)];
    return {
      value: String(value),
      label: entry?.label ?? String(value),
      dot: entry?.dot,
    };
  });

  return (
    <EmbroideryInlineSelect
      options={options}
      onSelect={(value) => onPriorityChange(Number(value))}
      ariaLabel="Cambiar prioridad de la orden"
      isPending={isPending}
      triggerClassName={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${current.cls}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dot}`}
        aria-hidden="true"
      />
      {current.label ?? String(prioridad)}
    </EmbroideryInlineSelect>
  );
}
