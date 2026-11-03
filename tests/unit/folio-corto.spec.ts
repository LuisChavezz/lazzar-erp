import { expect, test } from "@playwright/test";
import { formatFolioCorto } from "@/src/features/orders/utils/pedidoFormat";

test("folio corto: sin guiones ni año", () => {
  expect(formatFolioCorto("P-00124-2026")).toBe("P00124");
  expect(formatFolioCorto("OC-0012-2025")).toBe("OC0012");
  expect(formatFolioCorto("P-124")).toBe("P-124");
  expect(formatFolioCorto(null)).toBe("");
});
