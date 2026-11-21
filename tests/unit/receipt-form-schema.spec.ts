import { expect, test } from "@playwright/test";
import {
  CANTIDADES_REQUIRED_MESSAGE,
  ReceiptFormSchema,
} from "@/src/features/receipts/schemas/receipt.schema";
import {
  capturaManualRecepcion,
  motivoSinTope,
  pendienteRecepcion,
  sumarCantidades,
  tieneCantidadRecibida,
  topeManualRecepcion,
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

test.describe("pendiente exacto y tope manual (EC-900)", () => {
  test("el pendiente se toma exacto, entero o fraccionario", () => {
    expect(pendienteRecepcion("100.0000")).toBe(100);
    expect(pendienteRecepcion("10.5000")).toBe(10.5);
    expect(pendienteRecepcion("0.5000")).toBe(0.5);
    expect(pendienteRecepcion("6.75")).toBe(6.75);
    expect(pendienteRecepcion("0")).toBe(0);
    expect(pendienteRecepcion("-3")).toBe(0);
    expect(pendienteRecepcion("abc")).toBe(0);
  });

  test("la captura manual se topa en piezas enteras", () => {
    expect(topeManualRecepcion(100)).toBe(100);
    expect(topeManualRecepcion(10.5)).toBe(10);
    expect(topeManualRecepcion(0.5)).toBe(0);
    expect(topeManualRecepcion(0)).toBe(0);
  });

  test("con pendiente entero la captura manual se topa en lo pendiente", () => {
    expect(capturaManualRecepcion(3, 2, 5)).toBe(3);
    expect(capturaManualRecepcion(9, 2, 5)).toBe(5);
    expect(capturaManualRecepcion(6, 5, 5)).toBe(5);
    expect(capturaManualRecepcion(0, 5, 5)).toBe(0);
  });

  test("con pendiente fraccionario la captura manual no pasa del entero ni baja lo que fijó Todo", () => {
    // 10.5 pendiente: teclear topa en 10…
    expect(capturaManualRecepcion(12, 3, 10.5)).toBe(10);
    expect(capturaManualRecepcion(10, 3, 10.5)).toBe(10);
    // …pero un "+" (11) o un número de más sobre el 10.5 de "Todo" lo conservan.
    expect(capturaManualRecepcion(11, 10.5, 10.5)).toBe(10.5);
    expect(capturaManualRecepcion(40, 10.5, 10.5)).toBe(10.5);
    // "−" sobre 10.5 (10) sí baja.
    expect(capturaManualRecepcion(10, 10.5, 10.5)).toBe(10);
    // 0.5 pendiente: a mano no se captura nada; "Todo" fija 0.5 y "+" lo deja.
    expect(capturaManualRecepcion(1, 0, 0.5)).toBe(0);
    expect(capturaManualRecepcion(1, 0.5, 0.5)).toBe(0.5);
    expect(capturaManualRecepcion(0, 0.5, 0.5)).toBe(0);
  });

  test("solo no se puede recibir lo que no tiene pendiente", () => {
    expect(motivoSinTope("1.0000")).toBeNull();
    expect(motivoSinTope("10.5000")).toBeNull();
    expect(motivoSinTope("0.5000")).toBeNull();
    expect(motivoSinTope("0.0000")).toBe("Sin pendiente");
    expect(motivoSinTope("0")).toBe("Sin pendiente");
  });

  test("las sumas no arrastran ruido de punto flotante", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumarCantidades([0.1, 0.2])).toBe(0.3);
    expect(sumarCantidades([10.5, 0.5, 3])).toBe(14);
    expect(sumarCantidades([10.3, -0.1])).toBe(10.2);
    expect(sumarCantidades([])).toBe(0);
  });
});
