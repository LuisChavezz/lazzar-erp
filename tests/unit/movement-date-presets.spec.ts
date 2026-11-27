import { expect, test } from "@playwright/test";
import {
  activeMovementDatePreset,
  movementDatePresetRange,
} from "@/src/features/reports/utils/movementDatePresets";

// 2026-03-05 02:00 UTC = 4 de marzo en México.
const NOW = new Date("2026-03-05T02:00:00Z");

test("atajos de fecha se cuentan desde el día de hoy en México", () => {
  expect(movementDatePresetRange("hoy", NOW)).toEqual(["2026-03-04", "2026-03-04"]);
  expect(movementDatePresetRange("7dias", NOW)).toEqual(["2026-02-26", "2026-03-04"]);
  expect(movementDatePresetRange("mes", NOW)).toEqual(["2026-03-01", "2026-03-04"]);
  expect(movementDatePresetRange("mes_anterior", NOW)).toEqual(["2026-02-01", "2026-02-28"]);
});

test("mes anterior cruza el año", () => {
  expect(movementDatePresetRange("mes_anterior", new Date("2026-01-15T18:00:00Z"))).toEqual([
    "2025-12-01",
    "2025-12-31",
  ]);
});

test("detecta el atajo activo solo si el rango coincide exacto", () => {
  expect(activeMovementDatePreset("2026-03-01", "2026-03-04", NOW)).toBe("mes");
  expect(activeMovementDatePreset("2026-03-02", "2026-03-04", NOW)).toBeNull();
  expect(activeMovementDatePreset(null, "2026-03-04", NOW)).toBeNull();
});
