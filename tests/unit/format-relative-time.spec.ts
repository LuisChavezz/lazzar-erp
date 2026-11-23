import { expect, test } from "@playwright/test";
import { formatMexicoDateTime, formatRelativeTime } from "@/src/utils/formatRelativeTime";

/**
 * Etiqueta híbrida de las notificaciones (EC-930). "Ahora" se inyecta, y los
 * días-calendario, el año y la hora se leen en `America/Mexico_City` (UTC-6
 * todo el año desde 2022).
 */
const at = (iso: string) => new Date(iso).getTime();
const label = (createdAt: string, now: string) => formatRelativeTime(createdAt, at(now));

const NOW = "2026-11-23T12:00:00-06:00";

test.describe("formatRelativeTime: umbrales", () => {
  test("menos de un minuto: 'Hace un momento'", () => {
    expect(label(NOW, NOW)).toBe("Hace un momento");
    expect(label("2026-11-23T11:59:00.001-06:00", NOW)).toBe("Hace un momento");
  });

  test("un timestamp futuro (desfase de reloj) cuenta como 'Hace un momento'", () => {
    expect(label("2026-11-23T12:05:00-06:00", NOW)).toBe("Hace un momento");
    expect(label("2026-11-25T12:00:00-06:00", NOW)).toBe("Hace un momento");
  });

  test("de 1 a 59 minutos: 'Hace N min'", () => {
    expect(label("2026-11-23T11:59:00-06:00", NOW)).toBe("Hace 1 min");
    expect(label("2026-11-23T11:00:00.001-06:00", NOW)).toBe("Hace 59 min");
  });

  test("mismo día desde una hora: 'Hace 1 hora' / 'Hace N horas'", () => {
    expect(label("2026-11-23T11:00:00-06:00", NOW)).toBe("Hace 1 hora");
    expect(label("2026-11-23T10:00:00-06:00", NOW)).toBe("Hace 2 horas");
    expect(label("2026-11-23T00:00:00-06:00", NOW)).toBe("Hace 12 horas");
  });

  test("día anterior: 'Ayer, HH:mm' en 24 h", () => {
    expect(label("2026-11-22T23:59:59-06:00", NOW)).toBe("Ayer, 23:59");
    expect(label("2026-11-22T16:20:05.123456-06:00", NOW)).toBe("Ayer, 16:20");
    expect(label("2026-11-22T00:05:00-06:00", NOW)).toBe("Ayer, 00:05");
  });

  test("cruzando la medianoche: menos de una hora sigue en minutos, más es 'Ayer'", () => {
    const justAfterMidnight = "2026-11-23T00:30:00-06:00";
    expect(label("2026-11-22T23:50:00-06:00", justAfterMidnight)).toBe("Hace 40 min");
    expect(label("2026-11-22T23:00:00-06:00", justAfterMidnight)).toBe("Ayer, 23:00");
  });

  test("de 2 a 6 días-calendario: 'Hace N días', por calendario y no por bloques de 24 h", () => {
    // 25 h 10 min, pero dos días-calendario atrás.
    expect(label("2026-11-21T23:00:00-06:00", "2026-11-23T00:10:00-06:00")).toBe("Hace 2 días");
    expect(label("2026-11-21T12:00:00-06:00", NOW)).toBe("Hace 2 días");
    expect(label("2026-11-17T00:00:00-06:00", NOW)).toBe("Hace 6 días");
    expect(label("2026-11-17T23:59:59-06:00", NOW)).toBe("Hace 6 días");
  });

  test("7 días-calendario o más: fecha corta sin hora y sin año si es el actual", () => {
    expect(label("2026-11-16T23:59:59-06:00", NOW)).toMatch(/^16 nov\.?$/);
    expect(label("2026-11-13T16:20:05-06:00", NOW)).toMatch(/^13 nov\.?$/);
    expect(label("2026-01-01T00:00:00-06:00", NOW)).toMatch(/^01 ene\.?$/);
  });

  test("de otro año: la fecha lleva el año", () => {
    expect(label("2025-12-20T10:00:00-06:00", "2026-01-15T10:00:00-06:00")).toMatch(/^20 dic\.? 2025$/);
  });

  test("el cambio de año no rompe los días-calendario", () => {
    expect(label("2025-12-31T23:00:00-06:00", "2026-01-01T08:00:00-06:00")).toBe("Ayer, 23:00");
    expect(label("2025-12-31T23:00:00-06:00", "2026-01-05T08:00:00-06:00")).toBe("Hace 5 días");
  });

  test("valor ausente o inválido: null", () => {
    for (const value of [null, undefined, "", "no es fecha", "2026-13-45T99:00:00Z"]) {
      expect(formatRelativeTime(value, at(NOW))).toBeNull();
    }
  });
});

test.describe("formatRelativeTime: zona de México, no la del navegador ni UTC", () => {
  test("'Ayer' y el año salen del día en México aunque en UTC sea otro", () => {
    // 20:00 del 22 en México = 02:00 del 23 en UTC: mismo día UTC que NOW.
    expect(label("2026-11-22T20:00:00-06:00", NOW)).toBe("Ayer, 20:00");
    // 31 dic 20:00 en México = 1 ene 02:00 UTC: el año es 2025.
    expect(label("2025-12-31T20:00:00-06:00", "2026-01-15T10:00:00-06:00")).toMatch(/^31 dic\.? 2025$/);
  });

  test("con el proceso en otra zona (Tokio) el resultado no cambia", () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = "Asia/Tokyo";
      // Verifica que el cambio de zona surtió efecto antes de confiar en el caso.
      expect(new Date("2026-11-22T20:00:00-06:00").getDate()).toBe(23);
      expect(label("2026-11-22T20:00:00-06:00", NOW)).toBe("Ayer, 20:00");
      expect(label("2026-11-21T12:00:00-06:00", NOW)).toBe("Hace 2 días");
      expect(label("2025-12-31T20:00:00-06:00", "2026-01-15T10:00:00-06:00")).toMatch(/^31 dic\.? 2025$/);
      expect(formatMexicoDateTime("2026-11-13T16:20:05-06:00")).toMatch(/^13 nov\.? 2026 · 16:20$/);
    } finally {
      process.env.TZ = original;
    }
  });
});

test.describe("formatMexicoDateTime", () => {
  test("fecha y hora completas en México, estilo formatShortDateTime", () => {
    expect(formatMexicoDateTime("2026-11-13T16:20:05.123456-06:00")).toMatch(/^13 nov\.? 2026 · 16:20$/);
    expect(formatMexicoDateTime("2026-11-14T02:20:00Z")).toMatch(/^13 nov\.? 2026 · 20:20$/);
    expect(formatMexicoDateTime("2026-11-13T00:05:00-06:00")).toMatch(/^13 nov\.? 2026 · 00:05$/);
  });

  test("valor ausente o inválido: null", () => {
    for (const value of [null, undefined, "", "no es fecha"]) {
      expect(formatMexicoDateTime(value)).toBeNull();
    }
  });
});
