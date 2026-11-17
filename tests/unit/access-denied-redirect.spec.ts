import { expect, test } from "@playwright/test";
import { appRouteGroups } from "@/src/constants/appRoutes";
import { mainGroupKeys } from "@/src/constants/sidebarItems";
import { getFirstModuleEntry } from "@/src/utils/moduleEntry";
import { ACCESS_DENIED_PATH, findRoutePermissionRule, getRouteAccessRedirect } from "@/src/utils/routeAccess";

/**
 * EC-895: el proxy manda a "sin acceso" (no al Home) a quien abre una ruta sin
 * su permiso, en cualquier módulo. La página no tiene regla, así que nunca se
 * redirige a sí misma.
 */
const user = (permissions: string[]) => ({ role: "user", permissions }) as never;
const admin = { role: "admin", permissions: [] } as never;
const mainGroups = appRouteGroups.filter((group) => mainGroupKeys.has(group.key));

test.describe("getRouteAccessRedirect", () => {
  test("una sección de Producción sin su subcódigo va a sin acceso", () => {
    const profile = user(["R-PRODUCCION", "R-PRODUCCION-OB"]);
    expect(getRouteAccessRedirect("/manufacturing/production-orders", profile)).toBe(ACCESS_DENIED_PATH);
    expect(getRouteAccessRedirect("/manufacturing/reflective-orders/12", profile)).toBe(ACCESS_DENIED_PATH);
    expect(getRouteAccessRedirect("/manufacturing/corte-manga", profile)).toBe(ACCESS_DENIED_PATH);
    expect(getRouteAccessRedirect("/manufacturing/embroidery/12", profile)).toBeNull();
    expect(getRouteAccessRedirect("/manufacturing", profile)).toBeNull();
  });

  test("R-PRODUCCION solo no abre ninguna de las cuatro secciones (modelo plano)", () => {
    const profile = user(["R-PRODUCCION"]);
    for (const path of [
      "/manufacturing/production-orders",
      "/manufacturing/embroidery",
      "/manufacturing/reflective-orders",
      "/manufacturing/corte-manga",
    ]) {
      expect(getRouteAccessRedirect(path, profile)).toBe(ACCESS_DENIED_PATH);
    }
    expect(getRouteAccessRedirect("/manufacturing/special-orders", profile)).toBeNull();
  });

  test("cualquier otro módulo prohibido también va a sin acceso", () => {
    expect(getRouteAccessRedirect("/wms/picking", user(["R-PRODUCCION"]))).toBe(ACCESS_DENIED_PATH);
    expect(getRouteAccessRedirect("/finance", user(["R-PRODUCCION"]))).toBe(ACCESS_DENIED_PATH);
  });

  test("el admin entra a todo", () => {
    expect(getRouteAccessRedirect("/manufacturing/corte-manga", admin)).toBeNull();
    expect(getRouteAccessRedirect("/wms/picking", admin)).toBeNull();
  });

  test("la página sin acceso no tiene regla: no hay bucle", () => {
    expect(findRoutePermissionRule(ACCESS_DENIED_PATH)).toBeUndefined();
    expect(getRouteAccessRedirect(ACCESS_DENIED_PATH, user([]))).toBeNull();
  });
});

test.describe("getFirstModuleEntry", () => {
  test("lleva al primer módulo abrible, por su sección si no tiene el de módulo", () => {
    expect(getFirstModuleEntry(mainGroups, user(["R-PRODUCCION-OB"]))).toEqual({
      label: "Manufactura (Producción)",
      href: "/manufacturing/embroidery",
    });
    expect(getFirstModuleEntry(mainGroups, user(["R-PRODUCCION"]))?.href).toBe("/manufacturing");
  });

  test("sin ningún módulo abrible da null", () => {
    expect(getFirstModuleEntry(mainGroups, user([]))).toBeNull();
  });
});
