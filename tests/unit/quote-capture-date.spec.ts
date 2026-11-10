import { expect, test } from "@playwright/test";
import { quoteCaptureDateKey } from "@/src/features/quotes/utils/quoteCaptureDate";
import { MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";

/** "Fecha Captura" al editar una cotización: día local de `created_at` (EC-558). */
test.describe("quoteCaptureDateKey en America/Mexico_City", () => {
  test("la zona del proceso es la de México", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(MEXICO_TIME_ZONE);
  });

  test("un created_at con -06:00 da su mismo día", () => {
    expect(quoteCaptureDateKey("2026-11-07T11:57:19.274270-06:00", "2026-11-10")).toBe("2026-11-07");
  });

  test("tarde en la noche en México (ya mañana en UTC) sigue siendo ese día", () => {
    expect(quoteCaptureDateKey("2026-11-07T23:30:00-06:00", "2026-11-10")).toBe("2026-11-07");
    expect(quoteCaptureDateKey("2026-11-08T05:30:00Z", "2026-11-10")).toBe("2026-11-07");
  });

  test("sin created_at o con un valor que no parsea usa el respaldo", () => {
    expect(quoteCaptureDateKey(null, "2026-11-10")).toBe("2026-11-10");
    expect(quoteCaptureDateKey(undefined, "2026-11-10")).toBe("2026-11-10");
    expect(quoteCaptureDateKey("", "2026-11-10")).toBe("2026-11-10");
    expect(quoteCaptureDateKey("no-es-fecha", "2026-11-10")).toBe("2026-11-10");
  });
});
