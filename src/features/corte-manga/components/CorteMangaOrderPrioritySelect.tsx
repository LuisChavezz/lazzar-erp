"use client";

import { InlineSelect } from "@/src/components/InlineSelect";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  CORTE_MANGA_ORDER_PRIORITY_CODES,
  CORTE_MANGA_ORDER_PRIORITY_CONFIG,
  corteMangaOrderPriorityFallback,
} from "../constants/corteMangaOrderStatus";

interface CorteMangaOrderPrioritySelectProps {
  /** Prioridad actual (`prioridad`, entero libre en el backend). */
  value: number;
  onChange: (prioridad: number) => void;
  /** PATCH en vuelo: inhabilita el disparador y muestra un spinner. */
  isPending?: boolean;
  /** Sin permiso u orden cancelada: badge de solo lectura. */
  readOnly?: boolean;
}

/**
 * Selector CERRADO de prioridad: solo 1 Alta / 2 Media / 3 Baja, aunque el
 * backend acepte cualquier entero. Un valor fuera de 1-3 (histórico o escrito
 * por otra vía) se sigue pintando con su badge neutro y puede corregirse
 * eligiendo uno de los tres.
 */
export function CorteMangaOrderPrioritySelect({
  value,
  onChange,
  isPending = false,
  readOnly = false,
}: CorteMangaOrderPrioritySelectProps) {
  const current = CORTE_MANGA_ORDER_PRIORITY_CONFIG[value] ?? corteMangaOrderPriorityFallback(value);

  if (readOnly) {
    return <StatusBadge status={String(value)} config={{ [value]: current }} />;
  }

  return (
    <InlineSelect
      options={CORTE_MANGA_ORDER_PRIORITY_CODES.filter((codigo) => codigo !== value).map(
        (codigo) => ({
          value: String(codigo),
          label: CORTE_MANGA_ORDER_PRIORITY_CONFIG[codigo].label ?? String(codigo),
          dot: CORTE_MANGA_ORDER_PRIORITY_CONFIG[codigo].dot,
        }),
      )}
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
