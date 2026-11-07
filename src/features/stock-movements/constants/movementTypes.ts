/**
 * Tipos de movimiento de la auditoría de existencias y sus estilos (badge con
 * punto de color). Viven en un módulo de constantes, sin JSX ni componentes,
 * para que quien solo necesita los colores (el reporte de movimientos y su PDF,
 * que se carga aparte) no arrastre las columnas y diálogos de este módulo.
 */

// ─── Tipos de movimiento ─────────────────────────────────────────────────────

export type MovementType = "ENTRADA" | "SALIDA" | "TRASPASO" | "AJUSTE";

// ─── Configuración de estilos por tipo de movimiento ────────────────────────

export const MOVEMENT_TYPE_CONFIG: Record<
  string,
  { label: string; dot: string; badgeClass: string; textClass: string }
> = {
  ENTRADA: {
    label: "Entrada",
    dot: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  SALIDA: {
    label: "Salida",
    dot: "bg-red-500",
    badgeClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/50",
    textClass: "text-red-600 dark:text-red-400",
  },
  TRASPASO: {
    label: "Traspaso",
    dot: "bg-blue-500",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/50",
    textClass: "text-blue-600 dark:text-blue-400",
  },
  AJUSTE: {
    label: "Ajuste",
    dot: "bg-amber-500",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50",
    textClass: "text-amber-600 dark:text-amber-400",
  },
};
