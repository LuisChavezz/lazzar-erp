import { expect, test } from "@playwright/test";
import {
  canAcceptQuoteChanges,
  canManageQuoteAuthorization,
  PENDING_AUTHORIZATION_QUOTE_STATUS,
} from "@/src/features/quotes/utils/quoteStatusRules";

/**
 * EC-752: autorizar y rechazar solo aplican a una cotización pendiente de
 * autorización (estatus 2), igual que en el backend (`autorizar/` y
 * `rechazar/` responden 400 `cotizacion` en cualquier otro). El 5 (cambios
 * solicitados) se resuelve con aceptar/rechazar cambios.
 */
test.describe("canManageQuoteAuthorization", () => {
  test("solo el estatus pendiente de autorización", () => {
    expect(PENDING_AUTHORIZATION_QUOTE_STATUS).toBe(2);
    expect(canManageQuoteAuthorization(2)).toBe(true);
  });

  test("el 5 (cambios solicitados) ya no ofrece autorizar ni rechazar", () => {
    expect(canManageQuoteAuthorization(5)).toBe(false);
    expect(canAcceptQuoteChanges(5)).toBe(true);
  });

  test("ningún otro estatus, ni uno ausente", () => {
    for (const status of [0, 1, 3, 4, 6, 99, null, undefined]) {
      expect(canManageQuoteAuthorization(status)).toBe(false);
    }
  });
});
