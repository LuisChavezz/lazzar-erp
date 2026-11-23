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
  toFechaConfirmacionInputValue,
  toFechaConfirmacionPayload,
} from "@/src/features/orders/utils/pedidoConfirmacion";
import { getProcurementOrderColumnText } from "@/src/features/orders/utils/procurementOrderExport";
import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";
import type { PedidoExportRow } from "@/src/features/orders/interfaces/pedido-list.interface";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
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
  formatLocalDate,
  parseLocalDate,
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

const surtidoConfirmado = (fecha_confirmacion: string | null) =>
  SURTIDO_PEDIDO_EXPORT_COLUMNS.find((c) => c.header === "Confirmado")?.text({
    fecha_confirmacion,
  } as SurtidoPedido);

/** Lo que mostraba la hoja ANTES de EC-936: el día LOCAL (sin `timeZone`). */
const oldLocalLabel = (value: string) =>
  new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

const procurementConfirmado = (fecha_confirmacion: string | null) =>
  getProcurementOrderColumnText(
    { fecha_confirmacion } as PedidoExportRow,
    { id: "fecha_confirmacion" } as DataTableVisibleColumn<PedidoListItem>,
  );

/** Celdas de Compras y pedidos especiales, y el tooltip de Ventas (date-fns). */
const cellLabel = (value: string | null) => {
  const date = toMexicoDayLocalDate(value);
  return date ? format(date, "d MMM yyyy", { locale: es }) : "—";
};

test.describe("`fecha_confirmacion`: un día de México en cualquier zona (EC-936)", () => {
  for (const zone of [MEXICO_TIME_ZONE, ...OTHER_ZONES]) {
    test(`con el navegador en ${zone} se escribe la medianoche de México y todos leen el día elegido`, () => {
      withProcessTimeZone(zone, () => {
        for (const { value, label } of CALENDAR_CASES) {
          // Lo que manda `PedidoFechaConfirmacionField`: no depende de la zona.
          const stored = toFechaConfirmacionPayload(value);
          expect(stored).toBe(`${value}T00:00:00-06:00`);
          // El editor vuelve a mostrar el día elegido.
          expect(toFechaConfirmacionInputValue(stored)).toBe(value);
          // Hoja, pedido especial, PDF y exportación de surtido.
          expect(formatFechaConfirmacion(stored)).toBe(label);
          expect(surtidoConfirmado(stored)).toBe(label);
          // Celdas (Compras, especiales), tooltip de Ventas y exportación de Compras.
          const [anio, mes, dia] = value.split("-").map(Number);
          const local = new Date(anio, mes - 1, dia);
          expect(cellLabel(stored)).toBe(format(local, "d MMM yyyy", { locale: es }));
          expect(procurementConfirmado(stored)).toBe(local.toLocaleDateString("es-MX"));
          // Filtro de mes de pedidos especiales: el mes del día visible.
          expect(monthFilterKey(stored)).toBe(value.slice(0, 7));
        }
        expect(formatFechaConfirmacion(null)).toBe("—");
        expect(formatFechaConfirmacion("sin fecha")).toBe("—");
        expect(surtidoConfirmado(null)).toBe("");
        expect(procurementConfirmado(null)).toBe("—");
        expect(cellLabel(null)).toBe("—");
      });
    });
  }

  test("el editor toma el día de México aunque el valor se haya guardado desde otra zona", () => {
    for (const zone of [MEXICO_TIME_ZONE, ...OTHER_ZONES]) {
      withProcessTimeZone(zone, () => {
        // Medianoche de Los Ángeles del 31 de enero = 02:00 del 31 en México.
        expect(toFechaConfirmacionInputValue("2026-01-31T00:00:00-08:00")).toBe("2026-01-31");
        // Medianoche de Tokio del 1 de febrero = 09:00 del 31 de enero en México.
        expect(toFechaConfirmacionInputValue("2026-02-01T00:00:00+09:00")).toBe("2026-01-31");
        expect(formatFechaConfirmacion("2026-02-01T00:00:00+09:00")).toBe("31 ene 2026");
        // Las dos filas de prueba con hora (12:00 de México) caen en su día.
        expect(toFechaConfirmacionInputValue("2026-12-15T18:00:00Z")).toBe("2026-12-15");
        expect(formatFechaConfirmacion("2026-12-15T18:00:00Z")).toBe("15 dic 2026");
        // Un "YYYY-MM-DD" pelado es el día tal cual; vacíos e inválidos, `null`.
        expect(toFechaConfirmacionInputValue("2026-01-31")).toBe("2026-01-31");
        expect(toFechaConfirmacionInputValue("2026-02-30")).toBeNull();
        expect(toFechaConfirmacionInputValue(null)).toBeNull();
        expect(toFechaConfirmacionInputValue("")).toBeNull();
        expect(toFechaConfirmacionInputValue("sin fecha")).toBeNull();
      });
    }
  });

  test("en el cambio de mes y de año no se corre el día en ninguna zona", () => {
    for (const zone of [MEXICO_TIME_ZONE, ...OTHER_ZONES]) {
      withProcessTimeZone(zone, () => {
        for (const [value, label, mes] of [
          ["2026-10-31", "31 oct 2026", "2026-10"],
          ["2026-11-01", "01 nov 2026", "2026-11"],
          ["2026-12-31", "31 dic 2026", "2026-12"],
          ["2027-01-01", "01 ene 2027", "2027-01"],
        ] as const) {
          const stored = toFechaConfirmacionPayload(value);
          expect(toFechaConfirmacionInputValue(stored)).toBe(value);
          expect(formatFechaConfirmacion(stored)).toBe(label);
          expect(monthFilterKey(stored)).toBe(mes);
        }
      });
    }
  });

  test("un día inválido no produce valor (no se manda `null`, que borraría la confirmación)", () => {
    expect(toFechaConfirmacionPayload("2026-02-30")).toBeNull();
    expect(toFechaConfirmacionPayload("")).toBeNull();
    expect(toFechaConfirmacionPayload("2026-01-15T00:00:00-06:00")).toBeNull();
  });

  test("en México se escribe y se lee lo mismo que antes del cambio", () => {
    for (const { value } of CALENDAR_CASES) {
      const stored = toFechaConfirmacionPayload(value);
      if (!stored) throw new Error(`sin valor para ${value}`);
      // Antes: `toLocalMidnightIso`, que en México daba la misma medianoche.
      expect(stored).toBe(`${value}T00:00:00-06:00`);
      // Editor (antes `toLocalDateKey(parseLocalDate(value))`).
      expect(toFechaConfirmacionInputValue(stored)).toBe(value);
      // Hoja, pedido especial y PDF (antes en la zona local).
      expect(formatFechaConfirmacion(stored)).toBe(oldLocalLabel(stored));
      // Exportación de surtido (antes `exportDate`).
      expect(surtidoConfirmado(stored)).toBe(exportDate(stored));
      // Celdas y tooltip (antes `format(parseLocalDate(value))`).
      const parsed = parseLocalDate(stored);
      expect(parsed && cellLabel(stored)).toBe(parsed && format(parsed, "d MMM yyyy", { locale: es }));
      // Exportación de Compras (antes `formatLocalDate`).
      expect(procurementConfirmado(stored)).toBe(formatLocalDate(stored));
      // Filtro de mes de pedidos especiales (antes `localMonthFilterValue`).
      expect(monthFilterKey(stored)).toBe(monthFilterKey(localMonthFilterValue(stored)));
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
