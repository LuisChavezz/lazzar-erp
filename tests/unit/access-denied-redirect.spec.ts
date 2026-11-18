import { expect, test } from "@playwright/test";
import { homeCards } from "@/src/constants/homeCards";
import { getFirstHomeCardEntry, getHomeCardHref } from "@/src/utils/homeCardHref";
import { ACCESS_DENIED_PATH, findRoutePermissionRule, getRouteAccessRedirect } from "@/src/utils/routeAccess";

/**
 * EC-895: el proxy manda a "sin acceso" (no al Home) a quien abre una ruta sin
 * su permiso, en cualquier módulo. La página no tiene regla, así que nunca se
 * redirige a sí misma.
 */
const user = (permissions: string[]) => ({ role: "user", permissions }) as never;
const admin = { role: "admin", permissions: [] } as never;

test.describe("getRouteAccessRedirect", () => {
  test("una sección de Producción sin su subcódigo va a sin acceso", () => {
    const profile = user(["R-PRODUCCION", "R-PRODUCCION-OB"]);
    expect(getRouteAccessRedirect("/manufacturing/production-orders", profile)).toBe(ACCESS_DENIED_PATH);
    expect(getRouteAccessRedirect("/manufacturing/reflective-orders/12", profile)).toBe(ACCESS_DENIED_PATH);
    expect(getRouteAccessRedirect("/manufacturing/corte-manga", profile)).toBe(ACCESS_DENIED_PATH);
    expect(getRouteAccessRedirect("/manufacturing/embroidery/12", profile)).toBeNull();
    expect(getRouteAccessRedirect("/manufacturing", profile)).toBeNull();
  });

  test("las salidas a maquila se abren con R-PRODUCCION-OP, como su entrada del sidebar (EC-868)", () => {
    expect(getRouteAccessRedirect("/manufacturing/maquila-outputs", user(["R-PRODUCCION-OP"]))).toBeNull();
    expect(getRouteAccessRedirect("/manufacturing/maquila-outputs", user(["R-PRODUCCION"]))).toBe(
      ACCESS_DENIED_PATH,
    );
  });

  test("R-PRODUCCION solo no abre ninguna de las secciones con código propio (modelo plano)", () => {
    const profile = user(["R-PRODUCCION"]);
    for (const path of [
      "/manufacturing/production-orders",
      "/manufacturing/embroidery",
      "/manufacturing/reflective-orders",
      "/manufacturing/corte-manga",
      "/manufacturing/maquila-outputs",
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

test.describe("getFirstHomeCardEntry (salida de sin acceso)", () => {
  test("lleva a la primera tarjeta de Home abrible, por su sección si no tiene el de módulo", () => {
    expect(getFirstHomeCardEntry(user(["R-PRODUCCION-OB"]))).toEqual({
      title: "Manufactura (Producción)",
      href: "/manufacturing/embroidery",
    });
    expect(getFirstHomeCardEntry(user(["R-PRODUCCION"]))?.href).toBe("/manufacturing");
  });

  test("coincide con la primera tarjeta que pinta Home, en su orden", () => {
    const profile = user(["R-RH", "R-PRODUCCION-CM", "R-WMS-PICKING"]);
    const firstVisible = homeCards.find((card) => getHomeCardHref(card, profile) !== null);
    expect(getFirstHomeCardEntry(profile)).toEqual({
      title: firstVisible?.title,
      href: getHomeCardHref(firstVisible!, profile),
    });
    expect(getFirstHomeCardEntry(profile)?.href).toBe("/wms/picking");
  });

  test("sin ninguna tarjeta abrible (p. ej. solo configuración) da null, como Home", () => {
    expect(getFirstHomeCardEntry(user([]))).toBeNull();
    expect(getFirstHomeCardEntry(user(["R-CONFIGURACION"]))).toBeNull();
  });
});
