import type { PickingEstadoEmpaque } from "../interfaces/picking.interface";

/** Etiqueta y color del estado de empaque de un surtido (nucleo-erp#1283). */
export const PICKING_EMPAQUE_CONFIG: Record<PickingEstadoEmpaque, { label: string; cls: string; dot: string }> = {
  POR_EMPACAR: {
    label: "Por empacar",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  EMPACADO: {
    label: "Empacado",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  ENVIADO: {
    label: "Enviado",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
};

export const PICKING_EMPAQUE_OPTIONS = (Object.keys(PICKING_EMPAQUE_CONFIG) as PickingEstadoEmpaque[]).map(
  (value) => ({ value, label: PICKING_EMPAQUE_CONFIG[value].label }),
);
