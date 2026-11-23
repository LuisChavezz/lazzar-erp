import { expect, test } from "@playwright/test";
import { getNotificationTimestampView } from "@/src/features/notifications/utils/notificationTimestampView";

/** Lo que pinta `NotificationTimestamp` (EC-930). */
const NOW = new Date("2026-11-23T12:00:00-06:00").getTime();

test.describe("getNotificationTimestampView", () => {
  test("un created_at válido da dateTime, title completo y etiqueta", () => {
    const createdAt = "2026-11-22T16:20:05.123456-06:00";
    const view = getNotificationTimestampView(createdAt, NOW);
    expect(view).not.toBeNull();
    expect(view?.dateTime).toBe(createdAt);
    expect(view?.title).toMatch(/^22 nov\.? 2026 · 16:20$/);
    expect(view?.label).toBe("Ayer, 16:20");
  });

  test("sin 'ahora' (SSR/hidratación) no pinta nada", () => {
    expect(getNotificationTimestampView("2026-11-22T16:20:05-06:00", null)).toBeNull();
  });

  test("created_at ausente o inválido no pinta nada (nunca el texto 'null')", () => {
    for (const value of [null, undefined, "", "no es fecha"]) {
      expect(getNotificationTimestampView(value, NOW)).toBeNull();
    }
  });
});
