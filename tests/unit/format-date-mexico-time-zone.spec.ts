import { expect, test } from "@playwright/test";
import { formatShortDateTime, formatShortTime } from "@/src/utils/formatDate";
import { MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";

/*
  EC-931: los helpers de `formatDate.ts` que muestran una hora (o el día de un
  datetime) formatean en `MEXICO_TIME_ZONE`, la zona del backend, y no en la del
  navegador.

  La suite corre en México (`playwright.unit.config.ts`). Para probar un
  navegador en otra zona se cambia `process.env.TZ` dentro del proceso, como en
  `format-relative-time.spec.ts`: un proyecto aparte no puede tener otra zona
  (la config la fija para todos los workers). Cada cambio es síncrono —ningún
  otro test del worker corre en medio— y `finally` lo deshace.
*/

/** Zonas al este (Tokio, Madrid) y al oeste (Los Ángeles) de México, y UTC. */
const OTHER_ZONES = ["Asia/Tokyo", "Europe/Madrid", "America/Los_Angeles", "UTC"] as const;

const withProcessTimeZone = (timeZone: string, run: () => void) => {
  const original = process.env.TZ;
  try {
    process.env.TZ = timeZone;
    // El cambio de zona debe haber surtido efecto antes de confiar en el caso.
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(timeZone);
    run();
  } finally {
    // Asignar `undefined` guardaría el texto "undefined", una zona inválida.
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
};

/**
 * Datetimes cerca de la medianoche de México (y de fin de mes/año), con la
 * salida que daban los helpers ANTES del cambio con el proceso en México: en
 * México no puede cambiar ningún texto.
 */
const DATETIME_CASES = [
  { value: "2026-11-21T08:51:44.240435-06:00", time: "08:51 a.m.", dateTime: "21 nov 2026 · 08:51 a.m." },
  { value: "2026-11-21T12:00:00-06:00", time: "12:00 p.m.", dateTime: "21 nov 2026 · 12:00 p.m." },
  { value: "2026-11-21T00:05:00-06:00", time: "12:05 a.m.", dateTime: "21 nov 2026 · 12:05 a.m." },
  { value: "2026-11-21T23:55:00-06:00", time: "11:55 p.m.", dateTime: "21 nov 2026 · 11:55 p.m." },
  // Ya es el 22 en UTC, pero en México sigue siendo el 21.
  { value: "2026-11-22T05:30:00Z", time: "11:30 p.m.", dateTime: "21 nov 2026 · 11:30 p.m." },
  { value: "2026-12-31T23:30:00-06:00", time: "11:30 p.m.", dateTime: "31 dic 2026 · 11:30 p.m." },
  { value: "2027-01-01T00:10:00-06:00", time: "12:10 a.m.", dateTime: "01 ene 2027 · 12:10 a.m." },
  { value: "2026-02-28T23:59:00-06:00", time: "11:59 p.m.", dateTime: "28 feb 2026 · 11:59 p.m." },
  { value: "2026-03-01T00:00:00-06:00", time: "12:00 a.m.", dateTime: "01 mar 2026 · 12:00 a.m." },
  { value: "2026-07-14T18:30:00+00:00", time: "12:30 p.m.", dateTime: "14 jul 2026 · 12:30 p.m." },
] as const;

const EMPTY_VALUES = [null, undefined, "", "sin fecha"] as const;

test.describe("formatShortTime / formatShortDateTime", () => {
  test("la zona del proceso es la de México", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(MEXICO_TIME_ZONE);
  });

  test("en México la salida es la misma que antes del cambio (12 h, es-MX)", () => {
    for (const { value, time, dateTime } of DATETIME_CASES) {
      expect(formatShortTime(value)).toBe(time);
      expect(formatShortDateTime(value)).toBe(dateTime);
    }
  });

  for (const zone of OTHER_ZONES) {
    test(`con el navegador en ${zone} salen la hora y el día de México`, () => {
      withProcessTimeZone(zone, () => {
        for (const { value, time, dateTime } of DATETIME_CASES) {
          expect(formatShortTime(value)).toBe(time);
          expect(formatShortDateTime(value)).toBe(dateTime);
        }
      });
    });
  }

  test("un `Date` se formatea igual que su string", () => {
    withProcessTimeZone("Asia/Tokyo", () => {
      const date = new Date("2026-11-21T23:55:00-06:00");
      expect(formatShortTime(date)).toBe("11:55 p.m.");
      expect(formatShortDateTime(date)).toBe("21 nov 2026 · 11:55 p.m.");
    });
  });

  test("`timeZone` explícito manda sobre la de México, en día y hora a la vez", () => {
    expect(formatShortTime("2026-11-22T05:30:00Z", { timeZone: "UTC" })).toBe("05:30 a.m.");
    expect(formatShortDateTime("2026-11-22T05:30:00Z", { timeZone: "UTC" })).toBe("22 nov 2026 · 05:30 a.m.");
  });

  test("— para vacíos o valores que no parsean, en cualquier zona", () => {
    for (const zone of [MEXICO_TIME_ZONE, ...OTHER_ZONES]) {
      withProcessTimeZone(zone, () => {
        for (const value of EMPTY_VALUES) {
          expect(formatShortTime(value)).toBe("—");
          expect(formatShortDateTime(value)).toBe("—");
        }
      });
    }
  });
});
