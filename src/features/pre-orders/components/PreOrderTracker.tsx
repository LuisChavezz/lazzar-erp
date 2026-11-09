"use client";

import type { PreOrderStatus } from "../interfaces/pre-order.interface";

/**
 * Seguimiento "tipo pizzería": los 5 pasos del pedido especial desde que la
 * muestra tiene BOM hasta su OP. Cada paso dice QUIÉN lo hace, así el
 * usuario sabe qué sigue y con quién está, no solo una palabra de estatus.
 */
export const PRE_ORDER_STEPS = [
  { label: "Materiales", who: "Producción" },
  { label: "Validar", who: "Almacén" },
  { label: "Comprar", who: "Compras" },
  { label: "Material listo", who: "Almacén" },
  { label: "OP creada", who: "Producción" },
] as const;

/** Paso EN CURSO (0-based) según el estatus; 5 = todo terminado. */
export function currentStep(estatus: PreOrderStatus): number {
  switch (estatus) {
    case "pendiente_validar":
      return 1;
    case "faltan_materiales":
    case "en_compra":
      return 2;
    case "lista":
      return 4;
    case "convertida":
      return 5;
    default:
      return 1;
  }
}

type Tone = "done" | "current" | "todo" | "late" | "off";

function stepTone(index: number, estatus: PreOrderStatus, late: boolean): Tone {
  if (estatus === "cancelada") return "off";
  const cur = currentStep(estatus);
  if (index < cur) return "done";
  if (index === cur) return late ? "late" : "current";
  return "todo";
}

const DOT: Record<Tone, string> = {
  done: "bg-emerald-500 border-emerald-500 text-white",
  current: "bg-sky-500 border-sky-500 text-white ring-4 ring-sky-500/20",
  late: "bg-rose-500 border-rose-500 text-white ring-4 ring-rose-500/20",
  todo: "bg-white dark:bg-zinc-900 border-slate-300 dark:border-white/15 text-slate-400",
  off: "bg-slate-200 dark:bg-white/10 border-slate-200 dark:border-white/10 text-slate-400",
};
const BAR: Record<Tone, string> = {
  done: "bg-emerald-500",
  current: "bg-slate-200 dark:bg-white/10",
  late: "bg-slate-200 dark:bg-white/10",
  todo: "bg-slate-200 dark:bg-white/10",
  off: "bg-slate-200 dark:bg-white/10",
};

/** Versión grande para el detalle: 5 pasos con quién los hace. */
export function PreOrderTracker({ estatus, late = false }: { estatus: PreOrderStatus; late?: boolean }) {
  return (
    <ol className="flex items-start" aria-label="Seguimiento de la pre-orden">
      {PRE_ORDER_STEPS.map((step, i) => {
        const tone = stepTone(i, estatus, late);
        const isCurrent = tone === "current" || tone === "late";
        return (
          <li key={step.label} className="relative flex flex-1 flex-col items-center text-center" aria-current={isCurrent ? "step" : undefined}>
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute right-1/2 top-4 h-1 w-full -translate-y-1/2 rounded-full ${BAR[stepTone(i - 1, estatus, late)]}`}
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${DOT[tone]}`}
            >
              {tone === "done" ? "✓" : i + 1}
            </span>
            <span
              className={`mt-2 text-xs font-semibold ${
                isCurrent ? "text-slate-900 dark:text-white" : tone === "done" ? "text-slate-600 dark:text-slate-300" : "text-slate-400"
              }`}
            >
              {step.label}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">{step.who}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Versión compacta para tablas: 5 puntos + "Paso actual · quién". */
export function PreOrderTrackerMini({ estatus, late = false }: { estatus: PreOrderStatus; late?: boolean }) {
  const cur = currentStep(estatus);
  const label =
    estatus === "cancelada"
      ? "Cancelada"
      : cur >= PRE_ORDER_STEPS.length
        ? "Completada"
        : `${PRE_ORDER_STEPS[cur].label} · ${PRE_ORDER_STEPS[cur].who}`;
  return (
    <div className="flex flex-col gap-1" title={label}>
      <span className="flex items-center gap-1" aria-hidden="true">
        {PRE_ORDER_STEPS.map((step, i) => {
          const tone = stepTone(i, estatus, late);
          return (
            <span
              key={step.label}
              className={`h-1.5 w-5 rounded-full ${
                tone === "done"
                  ? "bg-emerald-500"
                  : tone === "current"
                    ? "bg-sky-500"
                    : tone === "late"
                      ? "bg-rose-500"
                      : "bg-slate-200 dark:bg-white/10"
              }`}
            />
          );
        })}
      </span>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
        {label}
        {cur < PRE_ORDER_STEPS.length && estatus !== "cancelada" && (
          <span className="ml-1 font-normal text-slate-400 tabular-nums">{Math.min(cur + 1, 5)}/5</span>
        )}
      </span>
    </div>
  );
}

/** Urgente: material tarde, regresó por consumo, o justo y aún sin material. */
export function isUrgentPreOrder(p: {
  estatus: PreOrderStatus;
  semaforo?: string | null;
  regreso?: unknown;
}): boolean {
  if (p.estatus === "convertida" || p.estatus === "cancelada") return false;
  if (p.semaforo === "rojo") return true;
  if (p.regreso && p.estatus === "faltan_materiales") return true;
  return p.estatus === "lista";
}
