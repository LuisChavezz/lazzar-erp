import { expect, test } from "@playwright/test";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { isPlausibleDateKey } from "@/src/utils/plausibleDateKey";

/**
 * EC-626 (revisión): la portada del Panel de Control acepta cualquiera de los
 * códigos que muestran su tarjeta y su item del sidebar; los reportes siguen
 * exigiendo el suyo.
 */
test.describe("acceso al Panel de Control", () => {
  const user = (permissions: string[]) => ({ role: "user", permissions }) as never;

  test("con solo R-CORE-REPORTES entra a la portada y a los reportes", () => {
    expect(canAccessRoute("/system", user(["R-CORE-REPORTES"]))).toBe(true);
    expect(canAccessRoute("/system/reports/existencias", user(["R-CORE-REPORTES"]))).toBe(true);
  });

  test("con solo R-CORE entra a la portada pero no a los reportes", () => {
    expect(canAccessRoute("/system", user(["R-CORE"]))).toBe(true);
    expect(canAccessRoute("/system/reports/auxiliar", user(["R-CORE"]))).toBe(false);
  });

  test("sin ninguno de los dos no entra", () => {
    expect(canAccessRoute("/system", user(["R-CRM"]))).toBe(false);
  });
});

test.describe("isPlausibleDateKey (movido a src/utils)", () => {
  test("rechaza los años intermedios al teclear y acepta un día completo", () => {
    expect(isPlausibleDateKey("0002-09-16")).toBe(false);
    expect(isPlausibleDateKey("0202-09-16")).toBe(false);
    expect(isPlausibleDateKey("2026-09-16")).toBe(true);
    expect(isPlausibleDateKey("2026-02-30")).toBe(false);
  });
});
