import { expect, test } from "@playwright/test";
import {
  GOOGLE_EVENT_STATUSES,
  GOOGLE_EVENT_STATUS_CFG,
  GOOGLE_EVENT_STATUS_UNKNOWN_CFG,
  toGoogleEventStatusKey,
} from "@/src/features/google/constants/googleEventStatus";

/**
 * EC-903: el badge de estatus de un evento de Google Calendar cubre los tres
 * estatus de la API de Google, y uno desconocido (o `null`) ya no se pinta como
 * «Confirmado».
 */
test.describe("estatus de evento de Google Calendar", () => {
  test("cada estatus de Google tiene etiqueta propia", () => {
    expect(Object.keys(GOOGLE_EVENT_STATUS_CFG).sort()).toEqual([...GOOGLE_EVENT_STATUSES].sort());
    expect(GOOGLE_EVENT_STATUSES.map((s) => GOOGLE_EVENT_STATUS_CFG[s].label)).toEqual([
      "Confirmado",
      "Tentativo",
      "Cancelado",
    ]);
  });

  test("un estatus conocido se usa tal cual", () => {
    for (const status of GOOGLE_EVENT_STATUSES) {
      expect(toGoogleEventStatusKey(status)).toBe(status);
    }
  });

  test("uno desconocido, vacío o null cae al neutro «Sin estatus»", () => {
    for (const status of ["CONFIRMED", "deleted", "", null, undefined, "toString", "__proto__"]) {
      const key = toGoogleEventStatusKey(status);
      expect(key).toBe("");
      expect(Object.hasOwn(GOOGLE_EVENT_STATUS_CFG, key)).toBe(false);
    }
    expect(GOOGLE_EVENT_STATUS_UNKNOWN_CFG.label).toBe("Sin estatus");
    expect(GOOGLE_EVENT_STATUS_UNKNOWN_CFG.label).not.toBe(GOOGLE_EVENT_STATUS_CFG.confirmed.label);
  });
});
