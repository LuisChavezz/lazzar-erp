import { expect, test } from "@playwright/test";
import {
  CANTIDADES_REQUIRED_MESSAGE,
  ReceiptFormSchema,
} from "@/src/features/receipts/schemas/receipt.schema";

/**
 * EC-893: el alta de recepción exige al menos una cantidad recibida mayor a 0;
 * sin ella el POST saldría con `detalle: []` (el backend lo rechaza, EC-894).
 */

const base = {
  almacen: 1,
  serie_codigo: "RC",
  remision: "",
  factura_referencia: "",
  observaciones: "",
};

const cantidadesIssues = (cantidades: Record<string, string>) => {
  const parsed = ReceiptFormSchema.safeParse({ ...base, cantidades });
  if (parsed.success) return [];
  return parsed.error.issues.filter((issue) => issue.path[0] === "cantidades");
};

test.describe("ReceiptFormSchema.cantidades", () => {
  test("todas vacías: rechaza con el mensaje en `cantidades`", () => {
    const issues = cantidadesIssues({ "10": "", "11": "  " });
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toBe(CANTIDADES_REQUIRED_MESSAGE);
  });

  test("todas en 0: rechaza", () => {
    const issues = cantidadesIssues({ "10": "0", "11": "0" });
    expect(issues.map((issue) => issue.message)).toEqual([CANTIDADES_REQUIRED_MESSAGE]);
  });

  test("una línea mayor a 0: acepta", () => {
    expect(ReceiptFormSchema.safeParse({ ...base, cantidades: { "10": "0", "11": "3" } }).success).toBe(true);
  });

  test("orden sin renglones (registro vacío): rechaza", () => {
    const issues = cantidadesIssues({});
    expect(issues.map((issue) => issue.message)).toEqual([CANTIDADES_REQUIRED_MESSAGE]);
  });

  test("la validación por campo (onBlur) usa la misma regla", () => {
    expect(ReceiptFormSchema.shape.cantidades.safeParse({}).success).toBe(false);
    expect(ReceiptFormSchema.shape.cantidades.safeParse({ "10": "1" }).success).toBe(true);
  });
});
