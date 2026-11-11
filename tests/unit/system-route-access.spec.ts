import { expect, test } from "@playwright/test";
import { appRouteGroups } from "@/src/constants/appRoutes";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { hasPermission, permissionRequirementCodes } from "@/src/utils/permissions";
import { isPlausibleDateKey } from "@/src/utils/plausibleDateKey";

/**
 * EC-626 (revisión): la portada del Panel de Control acepta cualquiera de los
 * códigos que muestran su tarjeta y su item del sidebar; los reportes siguen
 * exigiendo el suyo.
 */
test.describe("acceso al Panel de Control", () => {
  const user = (permissions: string[]) => ({ role: "user", permissions }) as never;

  test("con solo R-CORE-REPORTES entra a la portada y a los reportes", () => {
    expect(canAccessRoute("/system", user(["R-CORE-REPORTES"]))).toBe(true);
    expect(canAccessRoute("/system/reports/existencias", user(["R-CORE-REPORTES"]))).toBe(true);
  });

  test("con solo R-CORE entra a la portada pero no a los reportes", () => {
    expect(canAccessRoute("/system", user(["R-CORE"]))).toBe(true);
    expect(canAccessRoute("/system/reports/auxiliar", user(["R-CORE"]))).toBe(false);
  });

  test("sin ninguno de los dos no entra", () => {
    expect(canAccessRoute("/system", user(["R-CRM"]))).toBe(false);
  });

  // EC-854: la bitácora vive fuera de `/system/reports` para que la abra
  // cualquiera de los dos códigos, como exige el backend.
  test("la bitácora de documentos acepta R-CORE o R-CORE-REPORTES", () => {
    expect(canAccessRoute("/system/document-audit", user(["R-CORE"]))).toBe(true);
    expect(canAccessRoute("/system/document-audit", user(["R-CORE-REPORTES"]))).toBe(true);
    expect(canAccessRoute("/system/document-audit", user(["R-CRM"]))).toBe(false);
  });
});

test.describe("isPlausibleDateKey (movido a src/utils)", () => {
  test("rechaza los años intermedios al teclear y acepta un día completo", () => {
    expect(isPlausibleDateKey("0002-09-16")).toBe(false);
    expect(isPlausibleDateKey("0202-09-16")).toBe(false);
    expect(isPlausibleDateKey("2026-09-16")).toBe(true);
    expect(isPlausibleDateKey("2026-02-30")).toBe(false);
  });
});

/**
 * Las entradas al módulo (`getModuleEntryHref`, también el icono de inicio de
 * `ModuleNav`) llevan a la portada si `canAccessRoute(modulePath)` lo permite.
 * Fuera de `/system` esa regla debe dar EXACTAMENTE lo mismo que el permiso
 * del grupo, para cualquier código de cualquier módulo.
 */
test.describe("raíz de módulo en ModuleNav", () => {
  // Códigos de TODAS las hojas, también las ocultas (`showInSidebar: false`,
  // p. ej. `C-CRM-COTIZACIONES` del alta): `getGroupAccessPermissions` ya no
  // las cuenta (EC-813) y la matriz no debe perderlas.
  const codes = [
    ...new Set(
      appRouteGroups.flatMap((g) => [
        ...(g.permission ? [g.permission] : []),
        ...g.items.flatMap((item) => (item.permission ? permissionRequirementCodes(item.permission) : [])),
      ]),
    ),
  ];

  test("la matriz incluye los códigos de hojas ocultas", () => {
    expect(codes).toContain("C-CRM-COTIZACIONES");
  });
  const users = [
    { role: "admin", permissions: [] },
    { role: "user", permissions: [] },
    ...codes.map((code) => ({ role: "user", permissions: [code] })),
  ];

  for (const group of appRouteGroups.filter((g) => g.key !== "system")) {
    test(`${group.key}: la regla de su portada coincide con el permiso del grupo`, () => {
      for (const u of users) {
        const before = group.permission ? hasPermission(group.permission, u as never) : true;
        expect(canAccessRoute(group.modulePath, u as never), `${u.role} ${u.permissions.join("")}`).toBe(before);
      }
    });
  }
});
