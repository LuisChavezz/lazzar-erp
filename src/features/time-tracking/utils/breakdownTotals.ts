import type { TimeSegment } from "../interfaces/time-tracking.interface";
import { decimalToHundredths, msToHundredths } from "./hours";
import { toSegmentInterval } from "./segmentTime";

/** Totales del desglose por `tipo`, en centésimas de hora. */
export interface BreakdownTotals {
  normal: number;
  extra: number;
  /** Tramos que no se suman: sin fin, con horas inválidas o con un `tipo` fuera del catálogo. */
  skipped: number;
}

/**
 * Suma los tramos CERRADOS y válidos por `tipo`. Cada uno aporta su
 * `horas_trabajadas` (lo calcula el servidor con ambas horas); si no parsea,
 * la duración de sus horas. Todo en enteros.
 */
export const computeBreakdownTotals = (segments: readonly TimeSegment[]): BreakdownTotals => {
  const totals: BreakdownTotals = { normal: 0, extra: 0, skipped: 0 };
  for (const segment of segments) {
    const interval = toSegmentInterval(segment);
    if (
      !interval ||
      interval.endMs === null ||
      (segment.tipo !== "normal" && segment.tipo !== "extra")
    ) {
      totals.skipped += 1;
      continue;
    }
    totals[segment.tipo] +=
      decimalToHundredths(segment.horas_trabajadas) ??
      msToHundredths(interval.endMs - interval.startMs);
  }
  return totals;
};
