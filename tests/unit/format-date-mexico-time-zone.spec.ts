import { expect, test } from "@playwright/test";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SURTIDO_PEDIDO_EXPORT_COLUMNS } from "@/src/features/order-fulfillment/utils/surtidoPedidoExport";
import type { SurtidoPedido } from "@/src/features/order-fulfillment/interfaces/order-fulfillment.interface";
import {
  formatEntregaEstimada,
  formatFechaCalendario,
  formatFechaConfirmacion,
} from "@/src/features/orders/utils/pedidoFormat";
import {
  buildMonthFilterOptions,
  localMonthFilterValue,
  matchesMonthFilter,
  monthFilterKey,
} from "@/src/utils/columnFilterOptions";
import {
  formatShortCalendarDate,
  formatShortDate,
  formatShortDateTime,
  formatShortTime,
  LOCAL_TIME_ZONE,
  parseLocalDate,
  toLocalMidnightIso,
} from "@/src/utils/formatDate";
import { exportDate } from "@/src/utils/listExport";
import { MEXICO_TIME_ZONE, toMexicoDayLocalDate } from "@/src/utils/mexicoTime";

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

const withProcessTimeZone = (
  timeZone: string,
  run: () => void,
  { checkResolved = true }: { checkResolved?: boolean } = {},
) => {
  const original = process.env.TZ;
  try {
    process.env.TZ = timeZone;
    // El cambio de zona debe haber surtido efecto antes de confiar en el caso.
    if (checkResolved) expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(timeZone);
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

test.describe("`LOCAL_TIME_ZONE`: el modo local de `formatShortDate`", () => {
  test("omite `timeZone`: sale lo mismo que `toLocaleDateString` sin zona", () => {
    for (const zone of [MEXICO_TIME_ZONE, ...OTHER_ZONES]) {
      withProcessTimeZone(zone, () => {
        for (const { value } of DATETIME_CASES) {
          const sinZona = new Date(value).toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
          expect(formatShortDate(value, { timeZone: LOCAL_TIME_ZONE })).toBe(sinZona);
        }
      });
    }
  });

  test("no lanza aunque ICU no identifique la zona del proceso", () => {
    // Pasarla explícita ("Etc/Unknown") sí lanzaría `RangeError`.
    withProcessTimeZone(
      "Etc/Unknown",
      () => {
        expect(() =>
          formatShortDate("2026-11-21T08:51:44-06:00", { timeZone: LOCAL_TIME_ZONE }),
        ).not.toThrow();
      },
      { checkResolved: false },
    );
  });
});

const surtidoConfirmado = (fecha_confirmacion: string | null) =>
  SURTIDO_PEDIDO_EXPORT_COLUMNS.find((c) => c.header === "Confirmado")?.text({
    fecha_confirmacion,
  } as SurtidoPedido);

test.describe("`formatFechaConfirmacion`: en la zona del navegador (EC-936)", () => {
  for (const zone of [MEXICO_TIME_ZONE, ...OTHER_ZONES]) {
    test(`con el navegador en ${zone} la medianoche local guardada sale en el día capturado`, () => {
      withProcessTimeZone(zone, () => {
        for (const { value, label } of CALENDAR_CASES) {
          // Lo que escribe `PedidoFechaConfirmacionField` y lo que leen la hoja,
          // el pedido especial, el PDF y la exportación de surtido.
          const stored = toLocalMidnightIso(value);
          expect(formatFechaConfirmacion(stored)).toBe(label);
          expect(surtidoConfirmado(stored)).toBe(label);
        }
        expect(formatFechaConfirmacion(null)).toBe("—");
        expect(formatFechaConfirmacion("sin fecha")).toBe("—");
        expect(surtidoConfirmado(null)).toBe("");
      });
    });
  }

  test("con el navegador en Asia/Tokyo no se lee en la zona de México", () => {
    withProcessTimeZone("Asia/Tokyo", () => {
      const stored = toLocalMidnightIso("2026-12-31");
      expect(stored).toBe("2026-12-31T00:00:00+09:00");
      expect(formatShortDate(stored)).toBe("30 dic 2026");
      expect(formatFechaConfirmacion(stored)).toBe("31 dic 2026");
      expect(surtidoConfirmado(stored)).toBe("31 dic 2026");
    });
  });

  test("con el navegador en America/Los_Angeles un valor guardado en México sale en el día local", () => {
    withProcessTimeZone("America/Los_Angeles", () => {
      // Medianoche de México = 22:00 del día anterior en Los Ángeles (como antes de EC-931).
      expect(formatFechaConfirmacion("2027-01-15T00:00:00-06:00")).toBe("14 ene 2027");
      expect(formatShortDate("2027-01-15T00:00:00-06:00")).toBe("15 ene 2027");
    });
  });

  test("en México sale lo mismo que leían antes los tres lectores y la exportación", () => {
    for (const { value } of CALENDAR_CASES) {
      const stored = toLocalMidnightIso(value);
      // Hoja (`parseLocalDate` + `formatShortDate`), pedido especial y PDF (string crudo).
      expect(formatFechaConfirmacion(stored)).toBe(formatShortDate(parseLocalDate(stored)));
      expect(formatFechaConfirmacion(stored)).toBe(formatShortDate(stored));
      // Exportación de surtido (antes `exportDate`).
      expect(surtidoConfirmado(stored)).toBe(exportDate(stored));
    }
  });
});

test.describe("filtros de mes de encabezado", () => {
  /** El `monthFilterKey` anterior a EC-931: el mes LOCAL. */
  const oldMonthKey = (value: string | null | undefined) => {
    const date = parseLocalDate(value);
    return date ? format(date, "yyyy-MM") : "__sin_fecha__";
  };
  const VALUES = [
    ...DATETIME_CASES.map((c) => c.value),
    ...CALENDAR_CASES.map((c) => c.value),
    null,
    "",
    "sin fecha",
  ];

  test("en México las claves son las de antes", () => {
    for (const value of VALUES) expect(monthFilterKey(value)).toBe(oldMonthKey(value));
  });

  for (const zone of OTHER_ZONES) {
    test(`con el navegador en ${zone} un datetime cae en el mes de su día en México`, () => {
      withProcessTimeZone(zone, () => {
        // 00:30 del 1 de noviembre en México: en Los Ángeles aún es 31 de octubre.
        expect(monthFilterKey("2026-11-01T00:30:00-06:00")).toBe("2026-11");
        // 23:30 del 31 de octubre en México: en Tokio ya es 1 de noviembre.
        expect(monthFilterKey("2026-10-31T23:30:00-06:00")).toBe("2026-10");
        expect(matchesMonthFilter("2026-11-01T00:30:00-06:00", "2026-11")).toBe(true);
        expect(buildMonthFilterOptions(["2026-11-01T00:30:00-06:00"])).toEqual([
          { value: "2026-11", label: "Noviembre 2026" },
        ]);
        // Las fechas-calendario no pasan por ninguna zona.
        for (const { value } of CALENDAR_CASES) expect(monthFilterKey(value)).toBe(value.slice(0, 7));
        // La etiqueta del mes coincide con el día visible de la celda.
        for (const { value, dateTime } of DATETIME_CASES) {
          const [, mes, anio] = dateTime.split(" · ")[0].split(" ");
          const { label } = buildMonthFilterOptions([value])[0];
          expect(label.toLowerCase().startsWith(mes)).toBe(true);
          expect(label.endsWith(anio)).toBe(true);
        }
      });
    });
  }

  test("`localMonthFilterValue` conserva el mes LOCAL en cualquier zona (celdas locales)", () => {
    for (const zone of [MEXICO_TIME_ZONE, ...OTHER_ZONES]) {
      withProcessTimeZone(zone, () => {
        for (const value of VALUES) {
          expect(monthFilterKey(localMonthFilterValue(value))).toBe(oldMonthKey(value));
        }
      });
    }
  });
});

test.describe("`toMexicoDayLocalDate`: la fecha de los listados de pedidos (date-fns)", () => {
  const cell = (value: string) =>
    format(toMexicoDayLocalDate(value) ?? new Date(value), "d MMM yyyy", { locale: es });

  test("en México sale lo mismo que antes (`format(new Date(created_at))`)", () => {
    for (const { value } of DATETIME_CASES) {
      expect(cell(value)).toBe(format(new Date(value), "d MMM yyyy", { locale: es }));
    }
  });

  for (const zone of OTHER_ZONES) {
    test(`con el navegador en ${zone} sale el día de México, como la hoja del pedido`, () => {
      withProcessTimeZone(zone, () => {
        for (const { value } of DATETIME_CASES) {
          // Mismo día que `formatShortDate` (que pone el día a 2 dígitos).
          const [dia, mes, anio] = formatShortDate(value).split(" ");
          expect(cell(value)).toBe(`${Number(dia)} ${mes} ${anio}`);
        }
      });
    });
  }

  test("null si no hay valor o no parsea", () => {
    for (const value of [null, undefined, "", "sin fecha"]) {
      expect(toMexicoDayLocalDate(value)).toBeNull();
    }
  });
});

test.describe("celdas de fecha de la lista de órdenes de producción", () => {
  test("en México `formatShortDate` da lo mismo que el `toLocaleDateString` sin zona de antes", () => {
    for (const { value } of DATETIME_CASES) {
      expect(formatShortDate(value)).toBe(
        new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }),
      );
    }
  });
});
