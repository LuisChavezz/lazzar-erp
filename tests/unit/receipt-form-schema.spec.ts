import { expect, test } from "@playwright/test";
import {
  CANTIDADES_REQUIRED_MESSAGE,
  ReceiptFormSchema,
} from "@/src/features/receipts/schemas/receipt.schema";
import {
  motivoSinTope,
  tieneCantidadRecibida,
  topeRecepcion,
} from "@/src/features/receipts/utils/receiptQuantities";

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

test.describe("tieneCantidadRecibida (schema y payload comparten la regla)", () => {
  test("solo cuenta un número mayor a 0", () => {
    expect(tieneCantidadRecibida("1")).toBe(true);
    expect(tieneCantidadRecibida(" 3 ")).toBe(true);
    expect(tieneCantidadRecibida("0")).toBe(false);
    expect(tieneCantidadRecibida("")).toBe(false);
    expect(tieneCantidadRecibida("  ")).toBe(false);
    expect(tieneCantidadRecibida("-2")).toBe(false);
    expect(tieneCantidadRecibida("abc")).toBe(false);
    expect(tieneCantidadRecibida(undefined)).toBe(false);
  });

  test("el schema acepta exactamente cuando algún valor la cumple", () => {
    const casos: Record<string, string>[] = [{}, { "1": "0" }, { "1": "", "2": "4" }, { "1": "-1" }];
    for (const cantidades of casos) {
      expect(ReceiptFormSchema.shape.cantidades.safeParse(cantidades).success).toBe(
        Object.values(cantidades).some(tieneCantidadRecibida),
      );
    }
  });
});

test.describe("topeRecepcion y motivoSinTope", () => {
  test("el tope es lo pendiente en piezas enteras", () => {
    expect(topeRecepcion("100.0000")).toBe(100);
    expect(topeRecepcion("6.7500")).toBe(6);
    expect(topeRecepcion("0.5000")).toBe(0);
    expect(topeRecepcion("0")).toBe(0);
    expect(topeRecepcion("-3")).toBe(0);
    expect(topeRecepcion("abc")).toBe(0);
  });

  test("motivo solo cuando no hay una pieza entera pendiente", () => {
    expect(motivoSinTope("1.0000")).toBeNull();
    expect(motivoSinTope("6.7500")).toBeNull();
    expect(motivoSinTope("0.5000")).toBe("Pendiente fraccionario");
    expect(motivoSinTope("0.0000")).toBe("Sin pendiente");
    expect(motivoSinTope("0")).toBe("Sin pendiente");
  });
});
