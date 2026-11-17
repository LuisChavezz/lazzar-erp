import { expect, test } from "@playwright/test";
import { isSessionAccessPending, permissionGate } from "@/src/utils/permissionGate";
import {
  getOpCatalogAccess,
  OP_CATALOG_FORBIDDEN_REASON,
} from "@/src/features/time-tracking/utils/productionOrderOptions";

/**
 * EC-895: mientras la sesión carga o se recupera, un control que depende de un
 * permiso está PENDIENTE: no se ofrece, pero tampoco se dice que falte el
 * permiso. Lo usan los enlaces (`AccessibleLink` vía `useRouteAccess`),
 * "Recalcular consumos" y el selector de OP del desglose de RH.
 */
test.describe("isSessionAccessPending", () => {
  test("carga y recuperación cuentan como pendientes", () => {
    expect(isSessionAccessPending("loading", "idle")).toBe(true);
    expect(isSessionAccessPending("authenticated", "recovering")).toBe(true);
    expect(isSessionAccessPending("unauthenticated", "recovering")).toBe(true);
  });

  test("sesión resuelta (o recuperación agotada) ya no es pendiente", () => {
    expect(isSessionAccessPending("authenticated", "idle")).toBe(false);
    expect(isSessionAccessPending("unauthenticated", "exhausted")).toBe(false);
  });
});

test.describe("permissionGate", () => {
  test("pendiente gana sobre el permiso", () => {
    expect(permissionGate(true, true)).toBe("pending");
    expect(permissionGate(true, false)).toBe("pending");
    expect(permissionGate(false, true)).toBe("allowed");
    expect(permissionGate(false, false)).toBe("denied");
  });
});

test.describe("getOpCatalogAccess (desglose de horas)", () => {
  test("pendiente: no pide el catálogo ni da motivo de permiso", () => {
    expect(getOpCatalogAccess("pending")).toEqual({ enabled: false, unavailableReason: null });
  });

  test("sin R-PRODUCCION-OP: no lo pide y da el motivo", () => {
    expect(getOpCatalogAccess("denied")).toEqual({ enabled: false, unavailableReason: OP_CATALOG_FORBIDDEN_REASON });
  });

  test("con R-PRODUCCION-OP: lo pide", () => {
    expect(getOpCatalogAccess("allowed")).toEqual({ enabled: true, unavailableReason: null });
  });
});
