"use client";

import { SectionTitle } from "@/src/components/DetailDialogPrimitives";
import type { TipoControlHoras } from "../constants/timeTrackingChoices";
import type { BreakdownTotals } from "../utils/breakdownTotals";
import { decimalToHundredths, formatHundredths, formatSignedHundredths } from "../utils/hours";

interface TimeTrackingTotalsProps {
  totals: BreakdownTotals;
  /** `horas_normales` / `horas_extra` de la asistencia (`null` mientras no haya salida). */
  horasNormales: string | null;
  horasExtra: string | null;
  /** Horas de la asistencia: explican por qué aún no hay horas calculadas. */
  horaEntrada: string | null;
  horaSalida: string | null;
}

/** Por qué la asistencia aún no tiene horas calculadas. */
const missingHoursNote = (horaEntrada: string | null, horaSalida: string | null): string => {
  const base = " La asistencia aún no tiene horas calculadas";
  if (!horaEntrada && !horaSalida) return `${base} (le faltan la entrada y la salida).`;
  if (!horaEntrada) return `${base} (le falta la entrada).`;
  if (!horaSalida) return `${base} (le falta la salida).`;
  return `${base}.`;
};

const ROWS: { tipo: TipoControlHoras; label: string }[] = [
  { tipo: "normal", label: "Normales" },
  { tipo: "extra", label: "Extra" },
];

/**
 * Comparación INFORMATIVA de lo desglosado contra las horas que el servidor
 * calculó para la asistencia. Nunca bloquea nada. Todo en centésimas de hora
 * (enteros).
 */
export function TimeTrackingTotals({
  totals,
  horasNormales,
  horasExtra,
  horaEntrada,
  horaSalida,
}: TimeTrackingTotalsProps) {
  const attendanceHours: Record<TipoControlHoras, number | null> = {
    normal: decimalToHundredths(horasNormales),
    extra: decimalToHundredths(horasExtra),
  };
  const attendanceHasHours = attendanceHours.normal !== null || attendanceHours.extra !== null;

  return (
    <div className="rounded-xl border border-slate-100 dark:border-white/10 p-4">
      <SectionTitle>Comparación con la asistencia</SectionTitle>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-slate-400 dark:text-slate-500">
            <th className="py-1 font-medium">Horas</th>
            <th className="py-1 font-medium text-right">Desglosadas</th>
            <th className="py-1 font-medium text-right">Asistencia</th>
            <th className="py-1 font-medium text-right">Diferencia</th>
          </tr>
        </thead>
        <tbody className="tabular-nums text-slate-700 dark:text-slate-200">
          {ROWS.map(({ tipo, label }) => {
            const own = totals[tipo];
            const reference = attendanceHours[tipo];
            const difference = reference !== null ? own - reference : null;
            return (
              <tr key={tipo}>
                <td className="py-1">{label}</td>
                <td className="py-1 text-right">{formatHundredths(own)} h</td>
                <td className="py-1 text-right">
                  {reference !== null ? `${formatHundredths(reference)} h` : "—"}
                </td>
                <td
                  className={`py-1 text-right ${
                    difference === null || difference === 0
                      ? "text-slate-500 dark:text-slate-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {difference !== null ? `${formatSignedHundredths(difference)} h` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-slate-400">
        Informativo: no impide registrar tramos.
        {!attendanceHasHours && missingHoursNote(horaEntrada, horaSalida)}
        {totals.skipped > 0 &&
          ` ${totals.skipped === 1 ? "Un tramo no se suma" : `${totals.skipped} tramos no se suman`} por no tener hora de fin o tener horas inválidas.`}
      </p>
    </div>
  );
}
