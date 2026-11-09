/**
 * Seguimiento por pasos, genérico (pre-orden, bordado, reflejante, corte de
 * manga). Presentación pura: quien lo usa decide los pasos y el paso actual.
 *
 * `current` es el índice 0-based del paso EN CURSO; `current >= steps.length`
 * significa todo terminado. `state` marca estados que no son pasos:
 * `halted` (detenido: el paso actual en ámbar; con `current < 0`, todos) y
 * `off` (cancelado: todo gris).
 */
export interface TrackerStep {
  label: string;
  /** Quién lo hace (opcional). */
  who?: string;
}

export type TrackerState = "normal" | "late" | "halted" | "off";
type Tone = "done" | "current" | "late" | "halted" | "todo" | "off";

function toneOf(index: number, current: number, state: TrackerState): Tone {
  if (state === "off") return "off";
  // Detenido sin paso conocido (`current < 0`): todo en ámbar.
  if (state === "halted" && current < 0) return "halted";
  if (index < current) return "done";
  if (index === current) return state === "late" ? "late" : state === "halted" ? "halted" : "current";
  return "todo";
}

const DOT: Record<Tone, string> = {
  done: "bg-emerald-500 border-emerald-500 text-white",
  current: "bg-sky-500 border-sky-500 text-white ring-4 ring-sky-500/20",
  late: "bg-rose-500 border-rose-500 text-white ring-4 ring-rose-500/20",
  halted: "bg-amber-500 border-amber-500 text-white ring-4 ring-amber-500/20",
  todo: "bg-white dark:bg-zinc-900 border-slate-300 dark:border-white/15 text-slate-400",
  off: "bg-slate-200 dark:bg-white/10 border-slate-200 dark:border-white/10 text-slate-400",
};
const SEG: Record<Tone, string> = {
  done: "bg-emerald-500",
  current: "bg-sky-500",
  late: "bg-rose-500",
  halted: "bg-amber-500",
  todo: "bg-slate-200 dark:bg-white/10",
  off: "bg-slate-200 dark:bg-white/10",
};

/** Versión grande: círculos numerados unidos por una barra. */
export function StepTracker({
  steps,
  current,
  state = "normal",
  label,
}: {
  steps: readonly TrackerStep[];
  current: number;
  state?: TrackerState;
  label: string;
}) {
  return (
    <ol className="flex items-start" aria-label={label}>
      {steps.map((step, i) => {
        const tone = toneOf(i, current, state);
        const isCurrent = tone === "current" || tone === "late" || tone === "halted";
        return (
          <li
            key={step.label}
            className="relative flex flex-1 flex-col items-center text-center"
            aria-current={isCurrent ? "step" : undefined}
          >
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute right-1/2 top-4 h-1 w-full -translate-y-1/2 rounded-full ${
                  toneOf(i - 1, current, state) === "done" ? SEG.done : SEG.todo
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${DOT[tone]}`}
            >
              {tone === "done" ? "✓" : i + 1}
            </span>
            <span
              className={`mt-2 text-xs font-semibold ${
                isCurrent
                  ? "text-slate-900 dark:text-white"
                  : tone === "done"
                    ? "text-slate-600 dark:text-slate-300"
                    : "text-slate-400"
              }`}
            >
              {step.label}
            </span>
            {step.who && (
              <span className="text-[10px] uppercase tracking-wider text-slate-400">{step.who}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Versión compacta para tablas: segmentos + texto del paso actual. */
export function StepTrackerMini({
  steps,
  current,
  state = "normal",
  text,
}: {
  steps: readonly TrackerStep[];
  current: number;
  state?: TrackerState;
  /** Texto bajo los segmentos (p. ej. "Ponchado · Jesús"). */
  text: string;
}) {
  const showCount = state === "normal" || state === "late" ? current >= 0 && current < steps.length : false;
  return (
    <div className="flex flex-col gap-1" title={text}>
      <span className="flex items-center gap-1" aria-hidden="true">
        {steps.map((step, i) => (
          <span key={step.label} className={`h-1.5 w-4 rounded-full ${SEG[toneOf(i, current, state)]}`} />
        ))}
      </span>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
        {text}
        {showCount && (
          <span className="ml-1 font-normal text-slate-400 tabular-nums">
            {current + 1}/{steps.length}
          </span>
        )}
      </span>
    </div>
  );
}
