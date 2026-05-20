// ─── Configuración estática de columnas del tablero Kanban ─────────────────────

// ─── Interfaz ─────────────────────────────────────────────────────────────────
export interface KanbanColumnConfig {
  /** Identificador único de la columna para el sistema DnD */
  id: string;
  /** Valor de estatus de la cotización que mapea a esta columna */
  estatus: number;
  /** Etiqueta visible en el encabezado de columna */
  label: string;
  /** Clases de color del texto del acento (encabezado) */
  accentText: string;
  /** Clases de fondo del círculo de acento */
  accentBg: string;
  /** Clase del color del borde izquierdo (strip de color) */
  accentBorderLeft: string;
  /** Clase del punto de color en el círculo de acento */
  accentDot: string;
  /** Clases del badge numérico en el encabezado */
  badgeClass: string;
  /** Sombra de color al hacer hover sobre un card (para las cards dentro de la columna) */
  cardShadowHover: string;
  /** Clases del contenedor de drop cuando está activo como drop target */
  dropActiveClass: string;
}

// ─── Configuración por columna ────────────────────────────────────────────────
export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: "col-1",
    estatus: 1,
    label: "Borrador",
    accentText: "text-slate-500 dark:text-slate-400",
    accentBg: "bg-slate-100 dark:bg-slate-500/10",
    accentBorderLeft: "border-l-slate-400",
    accentDot: "bg-slate-400",
    badgeClass: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
    cardShadowHover: "hover:shadow-slate-400/25 dark:hover:shadow-slate-500/25",
    dropActiveClass: "ring-2 ring-slate-400/50 bg-slate-50/40 dark:bg-slate-500/5",
  },
  {
    id: "col-2",
    estatus: 2,
    label: "Por Autorizar",
    accentText: "text-amber-600 dark:text-amber-400",
    accentBg: "bg-amber-50 dark:bg-amber-500/10",
    accentBorderLeft: "border-l-amber-400",
    accentDot: "bg-amber-400",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    cardShadowHover: "hover:shadow-amber-500/25 dark:hover:shadow-amber-500/25",
    dropActiveClass: "ring-2 ring-amber-400/50 bg-amber-50/40 dark:bg-amber-500/5",
  },
  {
    id: "col-3",
    estatus: 3,
    label: "Autorizada",
    accentText: "text-emerald-600 dark:text-emerald-400",
    accentBg: "bg-emerald-50 dark:bg-emerald-500/10",
    accentBorderLeft: "border-l-emerald-400",
    accentDot: "bg-emerald-400",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
    cardShadowHover: "hover:shadow-emerald-500/25 dark:hover:shadow-emerald-500/25",
    dropActiveClass: "ring-2 ring-emerald-400/50 bg-emerald-50/40 dark:bg-emerald-500/5",
  },
  {
    id: "col-4",
    estatus: 4,
    label: "Rechazada",
    accentText: "text-rose-600 dark:text-rose-400",
    accentBg: "bg-rose-50 dark:bg-rose-500/10",
    accentBorderLeft: "border-l-rose-400",
    accentDot: "bg-rose-400",
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
    cardShadowHover: "hover:shadow-rose-500/25 dark:hover:shadow-rose-500/25",
    dropActiveClass: "ring-2 ring-rose-400/50 bg-rose-50/40 dark:bg-rose-500/5",
  },
  {
    id: "col-5",
    estatus: 5,
    label: "Cambios Solicitados",
    accentText: "text-orange-600 dark:text-orange-400",
    accentBg: "bg-orange-50 dark:bg-orange-500/10",
    accentBorderLeft: "border-l-orange-400",
    accentDot: "bg-orange-400",
    badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
    cardShadowHover: "hover:shadow-orange-500/25 dark:hover:shadow-orange-500/25",
    dropActiveClass: "ring-2 ring-orange-400/50 bg-orange-50/40 dark:bg-orange-500/5",
  },
];
