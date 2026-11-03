import { CheckIcon, ChevronRightIcon } from "@/src/components/Icons";

/**
 * Badge y ">" de los "Documentos relacionados" (detalle de pedido y detalle de
 * orden de compra). El estatus de esos documentos llega como texto libre —cada
 * tipo con su vocabulario: "AUTORIZADA", "Cerrada", "En calidad"…—, así que el
 * tono se decide por palabra clave y lo que no encaja queda neutro.
 */
export type DocEstatusTone = "ok" | "bad" | "wait" | "neutral";

export const docEstatusTone = (estatus: string): DocEstatusTone => {
  const value = estatus.toLowerCase();
  if (/(cancel|rechaz)/.test(value)) return "bad";
  if (/(autoriz|complet|entregad|emitid|timbrad|recibid|finaliz|cerrad|pagad|surtid|aplicad)/.test(value)) return "ok";
  if (/(pendiente|borrador|proceso|parcial|revisi|calidad)/.test(value)) return "wait";
  return "neutral";
};

/** Texto del estatus en tipo oración ("AUTORIZADA" → "Autorizada"). */
const sentenceCase = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : value;

const TONE_CLASS: Record<Exclude<DocEstatusTone, "ok">, { badge: string; dot: string }> = {
  bad: { badge: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400", dot: "bg-rose-500" },
  wait: { badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", dot: "bg-amber-500" },
  neutral: { badge: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300", dot: "bg-slate-400" },
};

/** Estatus de un documento ligado: palomita verde si está cumplido, punto de color si no. */
export function DocEstatusBadge({ estatus }: { estatus: string }) {
  const tone = docEstatusTone(estatus);
  if (tone === "ok") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
        <span className="grid place-items-center w-3.5 h-3.5 rounded-full bg-emerald-500 text-white">
          <CheckIcon className="w-2.5 h-2.5" aria-hidden="true" />
        </span>
        {sentenceCase(estatus)}
      </span>
    );
  }
  const { badge, dot } = TONE_CLASS[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {sentenceCase(estatus)}
    </span>
  );
}

/** ">" del enlace a un documento: dice que se puede abrir su detalle. */
export const DocChevron = () => (
  <ChevronRightIcon
    className="w-3.5 h-3.5 shrink-0 text-sky-400 group-hover:translate-x-0.5 transition-transform"
    aria-hidden="true"
  />
);
