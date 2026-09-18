import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Catálogos de `tipo` y `estado` del contrato laboral.
 *
 * Viven aquí y no dentro del formulario porque tienen DOS consumidores: los
 * `FormSelect` del alta/edición y la tabla, que traduce el valor guardado a su
 * etiqueta.
 *
 * A diferencia de `tipo` en calendarios, ninguno de los dos admite cadena
 * vacía: ambos tienen default en el backend y el formulario los envía SIEMPRE.
 */

export const TIPO_CONTRATO_VALUES = ["indefinido", "determinado", "prueba"] as const;

export type TipoContrato = (typeof TIPO_CONTRATO_VALUES)[number];

export const TIPO_CONTRATO_OPTIONS: { value: TipoContrato; label: string }[] = [
  { value: "indefinido", label: "Indefinido" },
  { value: "determinado", label: "Tiempo determinado" },
  { value: "prueba", label: "Periodo de prueba" },
];

export const ESTADO_CONTRATO_VALUES = ["activo", "terminado", "renovado"] as const;

export type EstadoContrato = (typeof ESTADO_CONTRATO_VALUES)[number];

export const ESTADO_CONTRATO_OPTIONS: { value: EstadoContrato; label: string }[] = [
  { value: "activo", label: "Activo" },
  { value: "terminado", label: "Terminado" },
  { value: "renovado", label: "Renovado" },
];

/**
 * Traducen el valor guardado a su etiqueta. Devuelven `null` cuando el backend
 * manda un valor fuera del catálogo, para que la tabla pinte el guion.
 */
export const getTipoContratoLabel = (value: string | null | undefined) =>
  TIPO_CONTRATO_OPTIONS.find((option) => option.value === value)?.label ?? null;

export const getEstadoContratoLabel = (value: string | null | undefined) =>
  ESTADO_CONTRATO_OPTIONS.find((option) => option.value === value)?.label ?? null;

/**
 * Badge del `estado` de negocio del contrato. No confundir con el flag
 * `activo` (baja lógica del registro), que usa `ACTIVO_INACTIVO_CFG`: los dos
 * comparten el literal "activo", por eso la tabla los titula distinto.
 */
export const ESTADO_CONTRATO_CFG: Record<EstadoContrato, StatusBadgeConfigEntry> = {
  activo: {
    label: "Activo",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  terminado: {
    label: "Terminado",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  renovado: {
    label: "Renovado",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
};
