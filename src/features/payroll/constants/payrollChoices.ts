import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Catálogo de `estado` de la nómina (`/hr/nominas/`).
 *
 * El backend no aplica transiciones ni permisos: `estado` es un campo
 * escribible más. Las reglas viven SOLO en el cliente, con guarda `GET /{id}/`
 * antes de cada escritura:
 *
 * - `pendiente`: se edita (`E-RH`), se marca como pagada o se cancela (`D-RH`).
 * - `pagada` y `cancelada`: terminales, de solo lectura. No hay eliminar.
 */
export const ESTADO_NOMINA_VALUES = ["pendiente", "pagada", "cancelada"] as const;

export type EstadoNomina = (typeof ESTADO_NOMINA_VALUES)[number];

export const ESTADO_PENDIENTE: EstadoNomina = "pendiente";
export const ESTADO_PAGADA: EstadoNomina = "pagada";
export const ESTADO_CANCELADA: EstadoNomina = "cancelada";

export const ESTADO_NOMINA_OPTIONS: { value: EstadoNomina; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "pagada", label: "Pagada" },
  { value: "cancelada", label: "Cancelada" },
];

/** Etiqueta del estado; `null` si el backend manda un valor fuera del catálogo. */
export const getEstadoNominaLabel = (value: string | null | undefined) =>
  ESTADO_NOMINA_OPTIONS.find((option) => option.value === value)?.label ?? null;

export const ESTADO_NOMINA_CFG: Record<EstadoNomina, StatusBadgeConfigEntry> = {
  pendiente: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  pagada: {
    label: "Pagada",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  cancelada: {
    label: "Cancelada",
    cls: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};

/** Tipo de renglón (`detalles[].tipo`). */
export const TIPO_DETALLE_VALUES = ["percepcion", "deduccion"] as const;

export type TipoDetalleNomina = (typeof TIPO_DETALLE_VALUES)[number];

export const TIPO_DETALLE_OPTIONS: { value: TipoDetalleNomina; label: string }[] = [
  { value: "percepcion", label: "Percepción" },
  { value: "deduccion", label: "Deducción" },
];

export const getTipoDetalleLabel = (value: string | null | undefined) =>
  TIPO_DETALLE_OPTIONS.find((option) => option.value === value)?.label ?? value ?? "—";

/**
 * Renglón de salario base que siembra el alta individual: mismo código y
 * mismo monto (salario mensual × 15 / 30) que el que crea `generar_periodo/`,
 * pero NO el mismo concepto: el backend guarda "Salario base" y el alta guarda
 * "SALARIO BASE" (decisión de producto: conceptos en mayúsculas, como lo que
 * captura `forceUppercase`). Quien agrupe o busque por concepto debe comparar
 * sin distinguir mayúsculas.
 */
export const SALARIO_BASE_CODIGO = "PER001";
export const SALARIO_BASE_CONCEPTO = "SALARIO BASE";

/** Valores por defecto de los campos de renglón que la captura no muestra. */
export const DEFAULT_CANTIDAD = 1;
export const DEFAULT_UNIDAD = "MXN";

/** Topes del backend (`NominaDetalle`). */
export const CODIGO_MAX_LENGTH = 20;
export const CONCEPTO_MAX_LENGTH = 255;
