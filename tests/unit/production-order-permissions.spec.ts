import { expect, test } from "@playwright/test";
import {
  canCreateProductionOrder,
  canEditProductionOrder,
} from "@/src/features/production-orders/utils/productionOrderPermissions";

/**
 * EC-895: las escrituras de la OP usan los códigos que exigirá el backend
 * (EC-899). Cambiar estatus, editar la ruta crítica y recalcular consumos
 * exigen `E-PRODUCCION-OP`; "Crear OP" (listado y pre-orden) exige
 * `C-PRODUCCION-OP`. El código de lectura no basta. El admin pasa siempre.
 */
const user = (permissions: string[]) => ({ role: "user", permissions }) as never;
const admin = { role: "admin", permissions: [] } as never;
const soloLectura = user(["R-PRODUCCION", "R-PRODUCCION-OP", "R-PRODUCCION-OB", "R-PRODUCCION-OR", "R-PRODUCCION-CM"]);

test.describe("canEditProductionOrder (estatus, ruta crítica, recálculo)", () => {
  test("con E-PRODUCCION-OP sí", () => {
    expect(canEditProductionOrder(user(["R-PRODUCCION-OP", "E-PRODUCCION-OP"]))).toBe(true);
  });

  test("sin E-PRODUCCION-OP no, aunque tenga lectura, alta o baja", () => {
    expect(canEditProductionOrder(soloLectura)).toBe(false);
    expect(canEditProductionOrder(user(["R-PRODUCCION-OP", "C-PRODUCCION-OP", "D-PRODUCCION-OP"]))).toBe(false);
    expect(canEditProductionOrder(user(["E-PRODUCCION-OB", "E-PRODUCCION-OR", "E-PRODUCCION-CM"]))).toBe(false);
    expect(canEditProductionOrder(undefined)).toBe(false);
  });

  test("el admin sí", () => {
    expect(canEditProductionOrder(admin)).toBe(true);
  });
});

test.describe("canCreateProductionOrder (Crear OP desde pre-orden y listado)", () => {
  test("con C-PRODUCCION-OP sí", () => {
    expect(canCreateProductionOrder(user(["R-PRODUCCION", "C-PRODUCCION-OP"]))).toBe(true);
  });

  test("sin C-PRODUCCION-OP no, aunque pueda leer o editar", () => {
    expect(canCreateProductionOrder(soloLectura)).toBe(false);
    expect(canCreateProductionOrder(user(["R-PRODUCCION-OP", "E-PRODUCCION-OP"]))).toBe(false);
  });

  test("el admin sí", () => {
    expect(canCreateProductionOrder(admin)).toBe(true);
  });
});
