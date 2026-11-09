import { expect, test } from "@playwright/test";
import { formatCalendarMonth } from "@/src/utils/formatDate";

/** Mes-calendario "YYYY-MM" del backend (p. ej. `clientes_nuevos.mes`) como texto. */
test.describe("formatCalendarMonth", () => {
  test("un mes válido, con mayúscula inicial", () => {
    expect(formatCalendarMonth("2026-11")).toBe("Noviembre 2026");
    expect(formatCalendarMonth("2027-01")).toBe("Enero 2027");
    expect(formatCalendarMonth("2026-12")).toBe("Diciembre 2026");
  });

  test("null con un mes fuera de rango", () => {
    expect(formatCalendarMonth("2026-13")).toBeNull();
    expect(formatCalendarMonth("2026-00")).toBeNull();
  });

  test("null sin el mes a dos dígitos", () => {
    expect(formatCalendarMonth("2026-1")).toBeNull();
  });

  test("null con un valor vacío o sin forma de mes", () => {
    expect(formatCalendarMonth("")).toBeNull();
    expect(formatCalendarMonth(null)).toBeNull();
    expect(formatCalendarMonth(undefined)).toBeNull();
    expect(formatCalendarMonth("noviembre")).toBeNull();
    expect(formatCalendarMonth("2026-11-01")).toBeNull();
  });
});
