import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type {
  RotationClase,
  RotationEstado,
  RotationFabricacion,
} from "../interfaces/rotation-board.interface";

/**
 * Presentación de los enums del tablero de rotación. Las llaves son los
 * valores exactos del backend (`planeacion/services/tablero_rotacion.py`);
 * `StatusBadge` degrada a su estilo neutro si llegara uno no listado. Los usan
 * las celdas, los filtros de encabezado (el menú es la leyenda) y las tarjetas.
 */

/** `estado`: qué decidir con el artículo, en el orden de prioridad del backend. */
export const ROTATION_ESTADO_CONFIG: Record<RotationEstado, StatusBadgeConfigEntry> = {
  SIN_VENTA: {
    label: "Sin venta",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  RESURTIR: {
    label: "Resurtir",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  SOBREINVENTARIO: {
    label: "Sobreinventario",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  LENTO: {
    label: "Lento",
    cls: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  OK: {
    label: "OK",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
};

/** `clase_abc`: Pareto por piezas del periodo (A hasta 80 %, B hasta 95 %). */
export const ROTATION_CLASE_CONFIG: Record<RotationClase, StatusBadgeConfigEntry> = {
  A: {
    label: "A",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  B: {
    label: "B",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  C: {
    label: "C",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300",
    dot: "bg-slate-400",
  },
};

/**
 * `fabricacion` (filtro): si la materia prima en existencia alcanza para el
 * resurtido sugerido. `ALCANZA`/`NO_ALCANZA` solo aplican a filas con
 * resurtido; `SIN_BOM`, a las variantes sin BOM activo.
 */
export const ROTATION_FABRICACION_CONFIG: Record<RotationFabricacion, StatusBadgeConfigEntry> = {
  ALCANZA: {
    label: "Alcanza",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  NO_ALCANZA: {
    label: "No alcanza",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  SIN_BOM: {
    label: "Sin BOM",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300",
    dot: "bg-slate-400",
  },
};
