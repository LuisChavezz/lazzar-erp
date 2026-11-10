import { expect, test } from "@playwright/test";
import { isCompanyGatedPath } from "@/src/constants/companyGatedRoutes";

/** EC-842: conjunto exacto de rutas que pasan por el gate de empresa. */

const GATED = [
  "/sales",
  "/sales/customers",
  "/sales/customers/12",
  "/sales/opportunities/3",
  "/sales/orders",
  "/sales/quotes",
  "/sales/quotes/new",
  "/sales/quotes/9/edit",
  "/finance",
  "/finance/invoicing/4",
  "/finance/accounting-customers",
  "/finance/price-lists",
  "/procurement/suppliers",
  "/procurement/suppliers/8",
  "/operations/customers",
  "/operations/orders",
  "/operations/scheduled-orders",
  "/operations/quotes",
  "/operations/dashboard",
  "/operations/inventory-pipeline",
  "/orders/2121",
  "/orders/2121/edit-mesa-control",
];

const NOT_GATED = [
  "/",
  "/sales/calendar",
  "/sales/emails",
  "/operations",
  "/operations/calendar",
  "/operations/emails",
  "/operations/samples",
  "/procurement",
  "/procurement/purchase-orders",
  "/procurement/dashboard",
  "/manufacturing/production-orders",
  "/wms",
  "/hr",
  "/system",
  "/config",
  // Prefijos que solo comparten letras con una regla no cuentan.
  "/salesforce",
  "/orders-archive",
  "/operations/orders-legacy",
];

test.describe("isCompanyGatedPath", () => {
  for (const path of GATED) {
    test(`bloquea ${path}`, () => {
      expect(isCompanyGatedPath(path)).toBe(true);
    });
  }
  for (const path of NOT_GATED) {
    test(`no bloquea ${path}`, () => {
      expect(isCompanyGatedPath(path)).toBe(false);
    });
  }
});
