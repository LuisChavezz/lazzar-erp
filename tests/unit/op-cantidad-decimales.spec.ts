import { expect, test } from "@playwright/test";
import {
  CANTIDAD_DECIMALES_MESSAGE,
  CreateProductionOrderDetalleSchema,
  hasAtMostTwoDecimals,
} from "@/src/features/production-orders/schemas/create-production-order.schema";

test.describe("cantidad de la OP: máximo 2 decimales (EC-898)", () => {
  test("acepta enteros y hasta 2 decimales, incluso con error de punto flotante", () => {
    for (const value of [150, 100.5, 100.55, 0.29, 0.07, 1234567.89]) {
      expect(hasAtMostTwoDecimals(value), String(value)).toBe(true);
    }
  });

  test("rechaza 3 o más decimales sin redondear", () => {
    for (const value of [100.555, 0.001, 1.234]) {
      expect(hasAtMostTwoDecimals(value), String(value)).toBe(false);
    }
  });

  test("el schema del renglón bloquea con el mensaje en `cantidad`", () => {
    const result = CreateProductionOrderDetalleSchema.safeParse({
      variante_produccion_id: 314,
      cantidad: 100.555,
      unidad: 12,
      observaciones: "",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => [issue.path.join("."), issue.message])).toEqual([
      ["cantidad", CANTIDAD_DECIMALES_MESSAGE],
    ]);
  });
});
