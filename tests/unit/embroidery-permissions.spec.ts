import { expect, test } from "@playwright/test";
import {
  canDeleteEmbroideryAvance,
  canEditEmbroideryOrder,
} from "@/src/features/embroidery/utils/embroideryPermissions";

/**
 * EC-895: en la orden de bordado, registrar avances exige `E-PRODUCCION-OB` y
 * borrarlos (destructivo) exige `D-PRODUCCION-OB`, el código que el backend ya
 * pide en `bordado-avances`. El admin pasa siempre.
 */
const user = (permissions: string[]) => ({ role: "user", permissions }) as never;

test.describe("avances de bordado", () => {
  test("con solo E- registra pero no borra", () => {
    const u = user(["R-PRODUCCION-OB", "E-PRODUCCION-OB"]);
    expect(canEditEmbroideryOrder(u)).toBe(true);
    expect(canDeleteEmbroideryAvance(u)).toBe(false);
  });

  test("con E- y D- registra y borra", () => {
    const u = user(["R-PRODUCCION-OB", "E-PRODUCCION-OB", "D-PRODUCCION-OB"]);
    expect(canEditEmbroideryOrder(u)).toBe(true);
    expect(canDeleteEmbroideryAvance(u)).toBe(true);
  });

  test("el D- de otra sección no sirve; el admin pasa", () => {
    expect(canDeleteEmbroideryAvance(user(["E-PRODUCCION-OB", "D-PRODUCCION-OR"]))).toBe(false);
    expect(canDeleteEmbroideryAvance({ role: "admin", permissions: [] } as never)).toBe(true);
  });
});
