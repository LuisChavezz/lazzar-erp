import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Catálogo de `estado` de la solicitud de vacaciones. Es el enum COMPLETO del
 * backend (`Vacaciones.ESTADO_CHOICES`); no expone endpoint de choices, así
 * que vive aquí.
 *
 * El formulario NUNCA envía `estado`: la alta nace "pendiente" por default del
 * modelo y las transiciones solo ocurren por `aprobar/` y `rechazar/`. El
 * backend acepta `estado` en un PATCH (defecto conocido), por eso no viaja.
 */

export const ESTADO_VACACION_VALUES = ["pendiente", "aprobado", "rechazado"] as const;

export type EstadoVacacion = (typeof ESTADO_VACACION_VALUES)[number];

export const ESTADO_PENDIENTE: EstadoVacacion = "pendiente";
export const ESTADO_APROBADO: EstadoVacacion = "aprobado";
export const ESTADO_RECHAZADO: EstadoVacacion = "rechazado";

export const ESTADO_VACACION_OPTIONS: { value: EstadoVacacion; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "aprobado", label: "Aprobada" },
  { value: "rechazado", label: "Rechazada" },
];

/**
 * Estados que OCUPAN el calendario del empleado: un periodo nuevo no puede
 * traslaparse con ninguno de ellos. Una solicitud rechazada ya no cuenta.
 */
export const ESTADOS_QUE_OCUPAN: readonly EstadoVacacion[] = [ESTADO_PENDIENTE, ESTADO_APROBADO];

/** Etiqueta del estado, o `null` si el backend manda un valor fuera del catálogo. */
export const getEstadoVacacionLabel = (value: string | null | undefined) =>
  ESTADO_VACACION_OPTIONS.find((option) => option.value === value)?.label ?? null;

export const ESTADO_VACACION_CFG: Record<EstadoVacacion, StatusBadgeConfigEntry> = {
  pendiente: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  aprobado: {
    label: "Aprobada",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  rechazado: {
    label: "Rechazada",
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
};
