import { expect, test } from "@playwright/test";
import { canListProductionOrders } from "@/src/features/time-tracking/utils/productionOrderOptions";

/**
 * EC-895: el desglose de horas (RH) no pide el listado de OP sin
 * `R-PRODUCCION-OP`, que el backend negaría con un 403.
 */
const user = (permissions: string[]) => ({ role: "user", permissions }) as never;
const admin = { role: "admin", permissions: [] } as never;
const soloModulo = user(["R-PRODUCCION"]);

test.describe("RH: desglose de horas", () => {
  test("el catálogo de OP solo se pide con R-PRODUCCION-OP", () => {
    expect(canListProductionOrders(user(["R-RH", "E-RH"]))).toBe(false);
    expect(canListProductionOrders(soloModulo)).toBe(false);
    expect(canListProductionOrders(user(["R-RH", "R-PRODUCCION-OP"]))).toBe(true);
    expect(canListProductionOrders(admin)).toBe(true);
    expect(canListProductionOrders(undefined)).toBe(false);
  });
});
