import { expect, test } from "@playwright/test";
import {
  GOOGLE_CALENDAR_EVENTS_KEY,
  googleCalendarEventsQueryKey,
  isSameCalendarRange,
  monthGridRange,
  toCalendarEventsParams,
  toCalendarRange,
} from "@/src/features/google/utils/calendarRange";

/**
 * EC-903: el calendario de Google pide solo su rango VISIBLE. Antes, una
 * ventana fija de -2/+6 meses dejaba vacío cualquier mes fuera de ella.
 * La suite corre en UTC-6 (`playwright.unit.config.ts`).
 */
test.describe("rango visible del calendario", () => {
  test("rango → timeMin/timeMax en ISO (medianoche local en UTC)", () => {
    const range = toCalendarRange(new Date(2026, 10, 1), new Date(2026, 11, 6));
    expect(range).toEqual({
      timeMin: "2026-11-01T06:00:00.000Z",
      timeMax: "2026-12-06T06:00:00.000Z",
    });
  });

  test("rango → parámetros del backend, con maxResults por página", () => {
    const params = toCalendarEventsParams(
      { timeMin: "2026-11-01T06:00:00.000Z", timeMax: "2026-12-06T06:00:00.000Z" },
      250,
    );
    expect(params).toEqual({
      timeMin: "2026-11-01T06:00:00.000Z",
      timeMax: "2026-12-06T06:00:00.000Z",
      maxResults: "250",
    });
  });

  test("la vista de mes empieza el domingo de la semana del día 1 y termina tras la del último día", () => {
    // Noviembre 2026: el 1 es domingo y el 30 lunes ⇒ 1 nov – 6 dic (excluido).
    expect(monthGridRange(new Date(2026, 10, 18))).toEqual(
      toCalendarRange(new Date(2026, 10, 1), new Date(2026, 11, 6)),
    );
    // Julio 2027: el 1 es jueves y el 31 sábado ⇒ 27 jun – 1 ago (excluido).
    expect(monthGridRange(new Date(2027, 6, 15))).toEqual(
      toCalendarRange(new Date(2027, 5, 27), new Date(2027, 7, 1)),
    );
    // Cambio de año: enero 2027 (el 1 es viernes, el 31 domingo) ⇒ 27 dic 2026 – 7 feb 2027.
    expect(monthGridRange(new Date(2027, 0, 31))).toEqual(
      toCalendarRange(new Date(2026, 11, 27), new Date(2027, 1, 7)),
    );
  });

  test("dos rangos con las mismas fechas son iguales (no piden otra vez)", () => {
    const a = toCalendarRange(new Date(2026, 10, 1), new Date(2026, 11, 6));
    const b = toCalendarRange(new Date(2026, 10, 1), new Date(2026, 11, 6));
    const other = toCalendarRange(new Date(2026, 11, 1), new Date(2027, 0, 3));
    expect(isSameCalendarRange(a, b)).toBe(true);
    expect(isSameCalendarRange(a, other)).toBe(false);
  });

  test("la llave lleva el rango y comparte el prefijo que invalida el alta", () => {
    const nov = toCalendarEventsParams(monthGridRange(new Date(2026, 10, 18)), 250);
    const dic = toCalendarEventsParams(monthGridRange(new Date(2026, 11, 18)), 250);
    const keyNov = googleCalendarEventsQueryKey(nov);
    expect(keyNov).toEqual(["google", "calendar", "events", nov]);
    expect(keyNov.slice(0, 3)).toEqual([...GOOGLE_CALENDAR_EVENTS_KEY]);
    expect(googleCalendarEventsQueryKey(dic)).not.toEqual(keyNov);
  });
});
