"use client";

import type { ProgramacionAvance } from "../utils/pickingProgramacionAvance";
import { getProgramacionDestinoLabel } from "../utils/pickingDestino";

interface PickingProgramacionPickerProps {
  avance: readonly ProgramacionAvance[];
  value: string;
  onChange: (destino: string) => void;
  error?: string;
}

/**
 * "¿Para qué programación es este surtido?": una tarjeta por destino con lo
 * surtido contra lo programado. El sistema preselecciona el primero con algo
 * pendiente; la decisión final es del usuario, y un destino ya cubierto se
 * puede elegir igual (se avisa, no se bloquea — nucleo-erp#1279).
 */
export function PickingProgramacionPicker({ avance, value, onChange, error }: PickingProgramacionPickerProps) {
  if (avance.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        ¿Para qué programación es? <span className="text-rose-500">*</span>
      </p>
      <div role="radiogroup" aria-label="Programación a surtir" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {avance.map((a) => {
          const active = value === a.destino;
          const cubierto = a.pendiente === 0;
          const pct = a.cantidad > 0 ? Math.min(100, (a.surtido / a.cantidad) * 100) : 0;
          return (
            <button
              key={a.destino}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(a.destino)}
              className={`rounded-xl border px-3 py-2.5 text-left transition cursor-pointer active:scale-[0.98] ${
                active
                  ? "border-sky-500 bg-sky-50 dark:bg-sky-500/10 ring-1 ring-sky-500"
                  : "border-slate-200 dark:border-white/10 hover:border-sky-400"
              } ${cubierto && !active ? "opacity-70" : ""}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={`text-sm font-semibold ${active ? "text-sky-700 dark:text-sky-300" : "text-slate-800 dark:text-slate-100"}`}>
                  {getProgramacionDestinoLabel(a.destino)}
                </span>
                {a.excedente > 0 ? (
                  <span className="rounded-full bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    +{a.excedente} de más
                  </span>
                ) : cubierto ? (
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    ✓ Cubierto
                  </span>
                ) : (
                  <span className="text-[11px] font-bold tabular-nums text-sky-700 dark:text-sky-300">faltan {a.pendiente}</span>
                )}
              </span>
              <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <span
                  className={`block h-full rounded-full ${a.excedente > 0 ? "bg-amber-500" : cubierto ? "bg-emerald-500" : "bg-sky-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                <span>
                  {a.surtido} de {a.cantidad} surtidas
                </span>
                {a.almacen_sugerido && <span className="truncate">→ {a.almacen_sugerido.nombre}</span>}
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1.5 ml-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
