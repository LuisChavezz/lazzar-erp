import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Catálogo de `estado` del registro de productividad.
 *
 * El backend no expone endpoint de choices ni aplica transiciones: acepta
 * cualquiera de los dos valores en cualquier escritura. Las reglas viven SOLO
 * en el cliente:
 *
 * - El alta siempre es `borrador`.
 * - `borrador` se edita, se confirma (`E-RH`) y se elimina (`D-RH`).
 * - `confirmado` es de solo lectura y no se elimina; `D-RH` puede devolverlo a
 *   `borrador` para corregirlo.
 */
export const ESTADO_PRODUCTIVIDAD_VALUES = ["borrador", "confirmado"] as const;

export type EstadoProductividad = (typeof ESTADO_PRODUCTIVIDAD_VALUES)[number];

export const ESTADO_BORRADOR: EstadoProductividad = "borrador";
export const ESTADO_CONFIRMADO: EstadoProductividad = "confirmado";

export const ESTADO_PRODUCTIVIDAD_OPTIONS: { value: EstadoProductividad; label: string }[] = [
  { value: "borrador", label: "Borrador" },
  { value: "confirmado", label: "Confirmado" },
];

/**
 * Traduce el valor guardado a su etiqueta. Devuelve `null` cuando el backend
 * manda un valor fuera del catálogo, para que la tabla pinte el guion.
 */
export const getEstadoProductividadLabel = (value: string | null | undefined) =>
  ESTADO_PRODUCTIVIDAD_OPTIONS.find((option) => option.value === value)?.label ?? null;

/** Colores de `polizaStatus` (borrador neutro) y de evaluaciones (cerrado en verde). */
export const ESTADO_PRODUCTIVIDAD_CFG: Record<EstadoProductividad, StatusBadgeConfigEntry> = {
  borrador: {
    label: "Borrador",
    cls: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
  confirmado: {
    label: "Confirmado",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
};
