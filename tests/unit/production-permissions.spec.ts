import { expect, test } from "@playwright/test";
import { hasPermission } from "@/src/utils/permissions";
import {
  hasProductionPermission,
  PRODUCTION_WRITE_PERMISSIONS,
  type ProductionSection,
} from "@/src/utils/productionPermissions";

/**
 * EC-895: una sola tabla de códigos de escritura de Producción (sección ×
 * acción) con un solo accesor, que resuelve al admin con la MISMA regla que el
 * resto de la app y el proxy (`hasPermission`, por rol de sesión).
 */
const user = (permissions: string[]) => ({ role: "user", permissions }) as never;
const SECTIONS: ProductionSection[] = ["OP", "OB", "OR", "CM"];

test.describe("PRODUCTION_WRITE_PERMISSIONS", () => {
  test("los códigos son exactamente los del catálogo (CM, nunca OCM)", () => {
    for (const section of SECTIONS) {
      expect(PRODUCTION_WRITE_PERMISSIONS[section]).toEqual({
        C: `C-PRODUCCION-${section}`,
        E: `E-PRODUCCION-${section}`,
        D: `D-PRODUCCION-${section}`,
      });
    }
  });
});

test.describe("hasProductionPermission", () => {
  test("cada código abre solo su sección y su acción", () => {
    const u = user(["E-PRODUCCION-OR", "D-PRODUCCION-CM", "C-PRODUCCION-OB"]);
    expect(hasProductionPermission(u, "OR", "E")).toBe(true);
    expect(hasProductionPermission(u, "OR", "D")).toBe(false);
    expect(hasProductionPermission(u, "CM", "D")).toBe(true);
    expect(hasProductionPermission(u, "CM", "E")).toBe(false);
    expect(hasProductionPermission(u, "OB", "C")).toBe(true);
    expect(hasProductionPermission(u, "OP", "C")).toBe(false);
  });

  test("borrar avances: con solo E- no, con E- y D- sí, en OB, OR y CM", () => {
    for (const section of ["OB", "OR", "CM"] as const) {
      const soloE = user([`R-PRODUCCION-${section}`, `E-PRODUCCION-${section}`]);
      const conD = user([`R-PRODUCCION-${section}`, `E-PRODUCCION-${section}`, `D-PRODUCCION-${section}`]);
      expect(hasProductionPermission(soloE, section, "E")).toBe(true);
      expect(hasProductionPermission(soloE, section, "D")).toBe(false);
      expect(hasProductionPermission(conD, section, "D")).toBe(true);
    }
  });

  test("el código de lectura no basta para escribir", () => {
    const lectura = user(["R-PRODUCCION", ...SECTIONS.map((s) => `R-PRODUCCION-${s}`)]);
    for (const section of SECTIONS) {
      for (const action of ["C", "E", "D"] as const) {
        expect(hasProductionPermission(lectura, section, action)).toBe(false);
      }
    }
  });

  test("admin: misma respuesta que hasPermission en las cuatro secciones", () => {
    // Incluye una sesión con rol "admin" sin las banderas de admin: antes OR y
    // CM la dejaban en solo lectura y OB/OP no; ahora todas siguen al rol.
    const sessions = [
      { role: "admin", permissions: [] },
      { role: "admin", permissions: [], is_superuser: false, is_admin_empresa: true },
      { role: "user", permissions: [], is_superuser: false, is_admin_empresa: false },
      null,
    ] as never[];
    for (const session of sessions) {
      for (const section of SECTIONS) {
        for (const action of ["C", "E", "D"] as const) {
          expect(hasProductionPermission(session, section, action)).toBe(
            hasPermission(PRODUCTION_WRITE_PERMISSIONS[section][action], session),
          );
        }
      }
    }
    expect(hasProductionPermission({ role: "admin", permissions: [] } as never, "OR", "E")).toBe(true);
  });
});
