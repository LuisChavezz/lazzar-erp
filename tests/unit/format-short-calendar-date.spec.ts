import { expect, test } from "@playwright/test";
import {
  formatShortCalendarDate,
  formatShortDate,
  getLocalTodayDate,
} from "@/src/utils/formatDate";
import { MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";

/**
 * Fechas-calendario que se veían un día antes en México (EC-558). Corre con la
 * zona del proceso en `America/Mexico_City` (UTC-6), donde se manifiesta el
 * bug; Node relee `process.env.TZ` al asignarlo. Se restaura al terminar para
 * no afectar a otras pruebas del mismo worker.
 */
test.describe("fechas-calendario en America/Mexico_City", () => {
  let previousTz: string | undefined;

  test.beforeAll(() => {
    previousTz = process.env.TZ;
    process.env.TZ = MEXICO_TIME_ZONE;
  });

  test.afterAll(() => {
    if (previousTz === undefined) delete process.env.TZ;
    else process.env.TZ = previousTz;
  });

  test("la zona del proceso es la de México", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(MEXICO_TIME_ZONE);
    expect(new Date(2026, 6, 14).getTimezoneOffset()).toBe(360);
  });

  test("un YYYY-MM-DD sale en su mismo día", () => {
    expect(formatShortCalendarDate("2026-07-14")).toBe(formatShortDate("2026-07-14", { timeZone: "UTC" }));
    expect(formatShortCalendarDate("2026-01-01")).toBe(formatShortDate("2026-01-01", { timeZone: "UTC" }));
    // El bug que corrige: con la zona de México el mismo valor cae en el día anterior.
    expect(formatShortDate("2026-07-14", { timeZone: MEXICO_TIME_ZONE })).toBe(
      formatShortDate("2026-07-13", { timeZone: "UTC" }),
    );
  });

  test("mismo formato que formatShortDate", () => {
    expect(formatShortCalendarDate("2026-07-14")).toMatch(/^14 jul\.? 2026$/);
  });

  test("un datetime con -06:00 sale en el día local", () => {
    expect(formatShortCalendarDate("2026-07-14T23:30:00-06:00")).toBe(
      formatShortDate("2026-07-14", { timeZone: "UTC" }),
    );
  });

  test("un datetime con +00:00 sale en el día local, no en el UTC", () => {
    // 03:00 UTC del 15 = 21:00 del 14 en México.
    expect(formatShortCalendarDate("2026-07-15T03:00:00+00:00")).toBe(
      formatShortDate("2026-07-14", { timeZone: "UTC" }),
    );
  });

  test("— para vacíos o valores que no parsean", () => {
    expect(formatShortCalendarDate(null)).toBe("—");
    expect(formatShortCalendarDate(undefined)).toBe("—");
    expect(formatShortCalendarDate("")).toBe("—");
    expect(formatShortCalendarDate("sin fecha")).toBe("—");
  });

  test("hoy local después de las 18:00 sigue siendo hoy", () => {
    // 19:30 del 14 en México = 01:30 UTC del 15: `toISOString()` ya da mañana.
    const tarde = new Date("2026-07-14T19:30:00-06:00");
    expect(tarde.toISOString().slice(0, 10)).toBe("2026-07-15");
    expect(getLocalTodayDate(tarde)).toBe("2026-07-14");
    expect(getLocalTodayDate(new Date("2026-07-14T00:05:00-06:00"))).toBe("2026-07-14");
  });
});
