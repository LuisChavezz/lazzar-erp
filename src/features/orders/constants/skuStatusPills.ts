/**
 * Pastillas de estado de SKU. Las comparten el estado del alta de SKU en
 * pedidos especiales (`LineSkuStatus`) y el diálogo de SKU de muestra del
 * detalle de pedido (`SampleSkuLinkDialog`), para que el mismo estado se vea
 * igual en las dos pantallas.
 */
const SKU_STATUS_PILL_BASE =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold";

const SKU_STATUS_PILL_TONES = {
  emerald:
    "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  amber:
    "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
  sky: "border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300",
  rose: "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300",
  violet:
    "border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300",
  slate:
    "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400",
} as const;

export type SkuStatusPillTone = keyof typeof SKU_STATUS_PILL_TONES;

/** Clases completas de la pastilla en el tono indicado. */
export const skuStatusPillClass = (tone: SkuStatusPillTone): string =>
  `${SKU_STATUS_PILL_BASE} ${SKU_STATUS_PILL_TONES[tone]}`;
