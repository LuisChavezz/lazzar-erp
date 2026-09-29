import { getMexicoTimeHHMM, getMexicoTodayDate } from "@/src/utils/mexicoTime";
import type { SegmentIssue, TipoControlHoras } from "../constants/timeTrackingChoices";
import type { TimeSegment } from "../interfaces/time-tracking.interface";
import { decimalToHundredths, HUNDREDTH_HOUR_MS } from "./hours";

/**
 * Reglas de tiempo del desglose, como funciones PURAS sobre INSTANTES (ms
 * desde epoch), nunca sobre textos "HH:MM": así un día con cambio de horario
 * no mueve los límites ni el corte.
 */

const MINUTE_MS = 60_000;

/** Instante de un datetime de la API, o `null` si no hay valor o no parsea. */
export const parseInstant = (iso: string | null | undefined): number | null => {
  if (!iso) {
    return null;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
};

const floorToMinute = (ms: number): number => Math.floor(ms / MINUTE_MS) * MINUTE_MS;
const ceilToMinute = (ms: number): number => Math.ceil(ms / MINUTE_MS) * MINUTE_MS;

/** "HH:MM" en hora de México de un instante. */
export const instantToHHMM = (ms: number): string => getMexicoTimeHHMM(new Date(ms).toISOString());

/**
 * Día "YYYY-MM-DD" en México de un instante. `getMexicoTodayDate` acepta
 * cualquier instante, no solo "ahora".
 */
export const instantToDateKey = (ms: number): string => getMexicoTodayDate(new Date(ms));

/**
 * Límites que la asistencia impone a sus tramos.
 *
 * - `entryMs`: la entrada TRUNCADA al minuto (una checada a las 07:59:42
 *   admite un tramo desde las 07:59). Es también la base del corte de horas
 *   extra. `null` si la asistencia no tiene entrada (o no parsea): entonces no
 *   se puede desglosar.
 * - `exitMs`: la salida EXACTA, o `null` (sin límite superior).
 */
export interface AttendanceBounds {
  entryMs: number | null;
  exitMs: number | null;
}

export const getAttendanceBounds = (attendance: {
  hora_entrada: string | null;
  hora_salida: string | null;
}): AttendanceBounds => {
  const entry = parseInstant(attendance.hora_entrada);
  if (entry === null) {
    return { entryMs: null, exitMs: null };
  }
  return { entryMs: floorToMinute(entry), exitMs: parseInstant(attendance.hora_salida) };
};

/**
 * Corte de horas extra: la entrada (truncada al minuto) más las
 * `horas_base_diarias` del turno de la asistencia, la misma regla que usa el
 * backend para `horas_extra` (contadas desde la entrada real, no por reloj).
 * `null` si falta la entrada o el turno no define horas base.
 */
export const getCutoffMs = (
  entryMs: number | null,
  horasBaseDiarias: string | null | undefined
): number | null => {
  if (entryMs === null) {
    return null;
  }
  const hundredths = decimalToHundredths(horasBaseDiarias);
  if (hundredths === null || hundredths < 0) {
    return null;
  }
  return entryMs + hundredths * HUNDREDTH_HOUR_MS;
};

/** Intervalo de un tramo guardado. `endMs` `null` = abierto (sin fin: se trata como infinito). */
export interface SegmentInterval {
  id: number;
  startMs: number;
  endMs: number | null;
}

/**
 * Intervalo de un tramo guardado para las reglas de traslape, o `null` si sus
 * horas no forman un intervalo (inicio que no parsea, fin que no parsea o que
 * no es posterior al inicio). Un tramo sin `hora_fin` es ABIERTO.
 */
export const toSegmentInterval = (segment: TimeSegment): SegmentInterval | null => {
  const startMs = parseInstant(segment.hora_inicio);
  if (startMs === null) {
    return null;
  }
  if (segment.hora_fin === null) {
    return { id: segment.id, startMs, endMs: null };
  }
  const endMs = parseInstant(segment.hora_fin);
  if (endMs === null || endMs <= startMs) {
    return null;
  }
  return { id: segment.id, startMs, endMs };
};

/**
 * ¿Se traslapan? Los extremos que se TOCAN no cuentan (un tramo puede empezar
 * justo donde termina otro). Un fin `null` es abierto.
 */
const intervalsOverlap = (
  aStart: number,
  aEnd: number | null,
  bStart: number,
  bEnd: number | null
): boolean => aStart < (bEnd ?? Infinity) && bStart < (aEnd ?? Infinity);

/** Primer tramo de `siblings` con el que choca `[startMs, endMs)`, o `null`. */
export const findOverlap = (
  startMs: number,
  endMs: number | null,
  siblings: readonly SegmentInterval[]
): SegmentInterval | null =>
  siblings.find((sibling) => intervalsOverlap(startMs, endMs, sibling.startMs, sibling.endMs)) ??
  null;

/** Rango legible de un intervalo: "09:00–11:30" o "09:00–sin fin". */
export const describeInterval = (interval: { startMs: number; endMs: number | null }): string =>
  `${instantToHHMM(interval.startMs)}–${
    interval.endMs !== null ? instantToHHMM(interval.endMs) : "sin fin"
  }`;

/**
 * Sugerencia de `tipo` para un tramo:
 * - termina a la hora del corte o antes → `normal`;
 * - empieza a la hora del corte o después → `extra`;
 * - lo cruza → `"cruza"`: no se sugiere nada (se avisa y se recomienda
 *   dividirlo; nunca se divide solo).
 * `null` si falta el corte o el tramo no es válido.
 */
export type TipoSuggestion = TipoControlHoras | "cruza" | null;

export const suggestTipo = (
  startMs: number | null,
  endMs: number | null,
  cutoffMs: number | null
): TipoSuggestion => {
  if (startMs === null || endMs === null || cutoffMs === null || endMs <= startMs) {
    return null;
  }
  if (endMs <= cutoffMs) {
    return "normal";
  }
  if (startMs >= cutoffMs) {
    return "extra";
  }
  return "cruza";
};

/**
 * Inconsistencias de un tramo guardado frente a la asistencia VIGENTE y sus
 * hermanos. Solo sirven para señalarlo: nunca se corrige nada solo.
 *
 * - `sin_fin`: no tiene `hora_fin`.
 * - `horas_invalidas`: el inicio no parsea, o el fin no es posterior al inicio
 *   (el backend puede guardar horas negativas).
 * - `fuera_de_jornada`: cae en otro día, antes de la entrada o después de la
 *   salida. Sin entrada no hay límites que evaluar, pero el día sí.
 * - `traslape`: choca con otro tramo de la misma asistencia (uno abierto
 *   cuenta hasta el infinito).
 */
export const getSegmentIssues = (
  segment: TimeSegment,
  segments: readonly TimeSegment[],
  fecha: string,
  bounds: AttendanceBounds
): SegmentIssue[] => {
  const issues: SegmentIssue[] = [];
  const startMs = parseInstant(segment.hora_inicio);
  const endMs = parseInstant(segment.hora_fin);
  const isOpen = segment.hora_fin === null;

  if (isOpen) {
    issues.push("sin_fin");
  }
  if (startMs === null || (!isOpen && (endMs === null || endMs <= startMs))) {
    issues.push("horas_invalidas");
  }
  if (startMs === null) {
    return issues;
  }

  const offDay =
    instantToDateKey(startMs) !== fecha || (endMs !== null && instantToDateKey(endMs) !== fecha);
  // Un inicio en la salida o después queda fuera aunque el tramo esté abierto
  // (sin fin que comparar).
  const outOfBounds =
    bounds.entryMs !== null &&
    (startMs < bounds.entryMs ||
      (bounds.exitMs !== null &&
        (startMs >= bounds.exitMs || (endMs !== null && endMs > bounds.exitMs))));
  if (offDay || outOfBounds) {
    issues.push("fuera_de_jornada");
  }

  const own = toSegmentInterval(segment);
  if (own) {
    const others = segments.flatMap((other) => {
      if (other.id === segment.id) return [];
      const interval = toSegmentInterval(other);
      return interval ? [interval] : [];
    });
    if (findOverlap(own.startMs, own.endMs, others)) {
      issues.push("traslape");
    }
  }
  return issues;
};

/**
 * Hora de inicio sugerida para un tramo NUEVO: donde termina el último tramo
 * cerrado (redondeado al minuto siguiente si trae segundos) o, si no hay, la
 * entrada. Vacío si con ese inicio no se podría guardar NINGÚN tramo:
 * - no cabe ni un minuto completo antes de la salida (el fin se captura en
 *   minutos y la salida puede traer segundos);
 * - un tramo abierto empieza antes de un minuto después (lo taparía);
 * - el resultado cae en otro día.
 */
export const getDefaultStartHHMM = (
  fecha: string,
  bounds: { entryMs: number; exitMs: number | null },
  segments: readonly TimeSegment[]
): string => {
  const intervals = segments.flatMap((segment) => {
    const interval = toSegmentInterval(segment);
    return interval ? [interval] : [];
  });
  let latest = bounds.entryMs;
  for (const interval of intervals) {
    if (interval.endMs !== null) {
      latest = Math.max(latest, ceilToMinute(interval.endMs));
    }
  }
  const earliestEnd = latest + MINUTE_MS;
  const blockedByOpen = intervals.some(
    (interval) => interval.endMs === null && interval.startMs < earliestEnd
  );
  if (
    (bounds.exitMs !== null && earliestEnd > bounds.exitMs) ||
    blockedByOpen ||
    instantToDateKey(latest) !== fecha
  ) {
    return "";
  }
  return instantToHHMM(latest);
};
