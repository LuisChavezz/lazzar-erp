import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * `tipo` de la cuenta contable, tal cual el enum del backend: el valor QUE VIAJA
 * es también la etiqueta que se muestra (vienen capitalizados del servidor).
 *
 * Es la naturaleza contable real del modelo. NO existe un campo `naturaleza`
 * deudora/acreedora: lo inventaba la maqueta faker de contabilidad —retirada en
 * EC-139, cuando este módulo la sustituyó—, que además escribía estos valores
 * en minúsculas y `Gasto` como "egreso".
 */
export const CUENTA_CONTABLE_TIPOS = [
  "Activo",
  "Pasivo",
  "Capital",
  "Ingreso",
  "Gasto",
  "Costo",
] as const;

export type CuentaContableTipo = (typeof CUENTA_CONTABLE_TIPOS)[number];

/**
 * Presentación del `tipo`. Llaves = valores CRUDOS del backend.
 *
 * Los colores siguen la lectura contable: lo que la empresa TIENE o GANA en
 * frío (`Activo`, `Ingreso`), lo que DEBE o GASTA en cálido (`Pasivo`, `Gasto`,
 * `Costo`) y el `Capital` aparte. No es un estado de flujo, así que ninguno
 * significa "todo bien" ni "problema".
 */
export const CUENTA_CONTABLE_TIPO_CONFIG: Record<
  CuentaContableTipo,
  StatusBadgeConfigEntry
> = {
  Activo: {
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  Pasivo: {
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  Capital: {
    cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  Ingreso: {
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Gasto: {
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  Costo: {
    cls: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
    dot: "bg-orange-500",
  },
};

/**
 * Opciones del filtro de tipo: el enum COMPLETO, no solo los tipos presentes en
 * los datos. `DataTable` compara `String(row[id]) === value` en memoria, y estos
 * valores ya son los crudos del backend, así que la comparación es directa.
 */
export const CUENTA_CONTABLE_TIPO_FILTER = CUENTA_CONTABLE_TIPOS.map((tipo) => ({
  value: tipo,
  label: tipo,
}));
