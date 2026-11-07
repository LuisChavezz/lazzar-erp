"use client";

import { formatQuantityValue } from "@/src/utils/formatCurrency";
import type {
  SpecialOrderServiceProgress,
  SpecialOrderTalla,
} from "../interfaces/special-order.interface";

const SERVICES = [
  { key: "bordado", label: "Bordado" },
  { key: "reflejante", label: "Reflejante" },
  { key: "corte_manga", label: "Corte manga" },
] as const;

type Tone = "done" | "progress" | "idle" | "none";

const TONE: Record<Tone, string> = {
  done: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  progress: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  idle: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  none: "bg-slate-50 text-slate-400 dark:bg-white/5 dark:text-slate-500",
};

const toneOf = (realizado: number, total: number): Tone =>
  total > 0 && realizado >= total ? "done" : realizado > 0 ? "progress" : "idle";

const Chip = ({ label, value, tone }: { label: string; value: string; tone: Tone }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] whitespace-nowrap ${TONE[tone]}`}
  >
    <span>{label}</span>
    <span className="tabular-nums font-semibold">{value}</span>
  </span>
);

const serviceChip = (label: string, progress: SpecialOrderServiceProgress) =>
  progress.programado <= 0 ? (
    // La talla lleva el servicio pero aún no está en ninguna orden.
    <Chip key={label} label={label} value="sin orden" tone="none" />
  ) : (
    <Chip
      key={label}
      label={label}
      value={`${formatQuantityValue(progress.realizado)}/${formatQuantityValue(progress.programado)}`}
      tone={toneOf(progress.realizado, progress.programado)}
    />
  );

/**
 * Avance de producción de UNA talla: surtido contra la cantidad pedida y, por
 * cada servicio que lleva, realizado contra programado (o "sin orden" si
 * todavía no se programa). Los servicios que la talla no lleva no se pintan.
 */
export function TallaAvance({ talla }: { talla: SpecialOrderTalla }) {
  const avance = talla.avance;
  if (!avance) return <span className="text-slate-400 dark:text-slate-500">—</span>;

  return (
    <div className="flex flex-wrap gap-1">
      <Chip
        label="Surtido"
        value={`${formatQuantityValue(avance.surtido)}/${formatQuantityValue(talla.cantidad)}`}
        tone={toneOf(avance.surtido, talla.cantidad)}
      />
      {SERVICES.map(({ key, label }) => {
        const progress = avance[key];
        return progress ? serviceChip(label, progress) : null;
      })}
    </div>
  );
}
