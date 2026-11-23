import { expect, test } from "@playwright/test";
import { formatEntregaEstimada, formatFechaCalendario } from "@/src/features/orders/utils/pedidoFormat";
import {
  formatShortCalendarDate,
  formatShortDate,
  formatShortDateTime,
  formatShortTime,
  getBrowserTimeZone,
  toLocalMidnightIso,
} from "@/src/utils/formatDate";
import { MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";

/*
  EC-931: los helpers de `formatDate.ts` que muestran una hora (o el día de un
  datetime) formatean en `MEXICO_TIME_ZONE`, la zona del backend, y no en la del
  navegador; las fechas-calendario ("YYYY-MM-DD") salen en su mismo día en
  cualquier zona. Con el proceso en México ningún texto cambia: las salidas
  esperadas de estas tablas son las que daban los helpers antes del cambio.

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

/** Fechas-calendario en bordes de mes y año (y un 29 de febrero), con su salida. */
const CALENDAR_CASES = [
  { value: "2026-01-01", label: "01 ene 2026" },
  { value: "2026-01-31", label: "31 ene 2026" },
  { value: "2026-02-01", label: "01 feb 2026" },
  { value: "2026-02-28", label: "28 feb 2026" },
  { value: "2026-03-01", label: "01 mar 2026" },
  { value: "2024-02-29", label: "29 feb 2024" },
  { value: "2026-07-14", label: "14 jul 2026" },
  { value: "2026-12-31", label: "31 dic 2026" },
  { value: "2027-01-01", label: "01 ene 2027" },
] as const;

test.describe("formatShortCalendarDate: el mismo día en cualquier zona", () => {
  for (const zone of [MEXICO_TIME_ZONE, ...OTHER_ZONES]) {
    test(`con el navegador en ${zone} un YYYY-MM-DD sale en su mismo día`, () => {
      withProcessTimeZone(zone, () => {
        for (const { value, label } of CALENDAR_CASES) {
          expect(formatShortCalendarDate(value)).toBe(label);
          // Igual que los consumidores de finanzas que pasan `timeZone: "UTC"`.
          expect(formatShortCalendarDate(value)).toBe(formatShortDate(value, { timeZone: "UTC" }));
        }
      });
    });
  }

  test("un datetime (con \"T\") sale igual que con `formatShortDate`", () => {
    for (const zone of [MEXICO_TIME_ZONE, ...OTHER_ZONES]) {
      withProcessTimeZone(zone, () => {
        for (const { value } of DATETIME_CASES) {
          expect(formatShortCalendarDate(value)).toBe(formatShortDate(value));
        }
      });
    }
  });

  test("— para vacíos, valores que no parsean y fechas imposibles, en cualquier zona", () => {
    for (const zone of [MEXICO_TIME_ZONE, ...OTHER_ZONES]) {
      withProcessTimeZone(zone, () => {
        for (const value of [...EMPTY_VALUES, "2026-02-30", "2026-13-01", "26-07-14", "2026-07-14T"]) {
          expect(formatShortCalendarDate(value)).toBe("—");
        }
      });
    }
  });
});

test.describe("fechas-calendario del pedido (`pedidoFormat`)", () => {
  for (const zone of [MEXICO_TIME_ZONE, ...OTHER_ZONES]) {
    test(`con el navegador en ${zone} no se corre el día`, () => {
      withProcessTimeZone(zone, () => {
        expect(formatFechaCalendario("2026-12-31")).toBe("31 dic 2026");
        expect(formatFechaCalendario(null)).toBe("—");
        expect(formatEntregaEstimada("2026-12-31", "2027-01-01")).toBe("31 dic 2026 – 01 ene 2027");
        expect(formatEntregaEstimada("2026-03-01", "2026-03-01")).toBe("01 mar 2026");
        expect(formatEntregaEstimada("2026-03-01", null)).toBe("—");
        expect(formatEntregaEstimada(null, "2026-03-01")).toBe("—");
      });
    });
  }
});

test.describe("formatShortDate: el día de un datetime en México", () => {
  /** Día de cada caso: la parte de fecha de `formatShortDateTime`. */
  const dayOf = (dateTime: string) => dateTime.split(" · ")[0];

  for (const zone of [MEXICO_TIME_ZONE, ...OTHER_ZONES]) {
    test(`con el navegador en ${zone} sale el día de México`, () => {
      withProcessTimeZone(zone, () => {
        for (const { value, dateTime } of DATETIME_CASES) {
          expect(formatShortDate(value)).toBe(dayOf(dateTime));
          expect(formatShortDate(new Date(value))).toBe(dayOf(dateTime));
        }
      });
    });
  }

  test("`timeZone: \"UTC\"` explícito (finanzas) no cambia en ninguna zona", () => {
    for (const zone of [MEXICO_TIME_ZONE, ...OTHER_ZONES]) {
      withProcessTimeZone(zone, () => {
        for (const { value, label } of CALENDAR_CASES) {
          expect(formatShortDate(value, { timeZone: "UTC" })).toBe(label);
        }
        // Un datetime se formatea en UTC, no en México: 23:55 del 21 en México es el 22 en UTC.
        expect(formatShortDate("2026-11-21T23:55:00-06:00", { timeZone: "UTC" })).toBe("22 nov 2026");
        expect(formatShortDate("2026-12-31T23:30:00-06:00", { timeZone: "UTC" })).toBe("01 ene 2027");
      });
    }
  });

  test("`timeZone: MEXICO_TIME_ZONE` explícito da lo mismo que omitirlo", () => {
    withProcessTimeZone("Asia/Tokyo", () => {
      for (const { value } of DATETIME_CASES) {
        expect(formatShortDate(value, { timeZone: MEXICO_TIME_ZONE })).toBe(formatShortDate(value));
      }
    });
  });

  test("— para vacíos o valores que no parsean, en cualquier zona", () => {
    for (const zone of [MEXICO_TIME_ZONE, ...OTHER_ZONES]) {
      withProcessTimeZone(zone, () => {
        for (const value of EMPTY_VALUES) {
          expect(formatShortDate(value)).toBe("—");
        }
      });
    }
  });
});

test.describe("`getBrowserTimeZone`: la lectura local de `fecha_confirmacion`", () => {
  test("es la zona del proceso", () => {
    expect(getBrowserTimeZone()).toBe(MEXICO_TIME_ZONE);
    for (const zone of OTHER_ZONES) {
      withProcessTimeZone(zone, () => expect(getBrowserTimeZone()).toBe(zone));
    }
  });

  for (const zone of [MEXICO_TIME_ZONE, ...OTHER_ZONES]) {
    test(`con el navegador en ${zone} la medianoche local guardada sale en el día capturado`, () => {
      withProcessTimeZone(zone, () => {
        for (const { value, label } of CALENDAR_CASES) {
          // Lo que escribe `PedidoFechaConfirmacionField` y lo que lee la hoja.
          const stored = toLocalMidnightIso(value);
          expect(formatShortDate(stored, { timeZone: getBrowserTimeZone() })).toBe(label);
        }
      });
    });
  }

  test("al este de México, leerla en la zona de México daría el día anterior", () => {
    // Por eso esos lectores no usan la zona de omisión.
    withProcessTimeZone("Asia/Tokyo", () => {
      const stored = toLocalMidnightIso("2026-12-31");
      expect(stored).toBe("2026-12-31T00:00:00+09:00");
      expect(formatShortDate(stored)).toBe("30 dic 2026");
      expect(formatShortDate(stored, { timeZone: getBrowserTimeZone() })).toBe("31 dic 2026");
    });
  });
});
