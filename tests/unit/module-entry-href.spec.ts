import { expect, test } from "@playwright/test";
import { appRouteGroups, getGroupAccessPermissions } from "@/src/constants/appRoutes";
import { getModuleEntryHref } from "@/src/utils/moduleEntry";
import { getSidebarItems } from "@/src/utils/getSidebarItems";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { getVisibleRouteSections } from "@/src/utils/routeSections";

/**
 * EC-813: las entradas a un módulo llevan a la portada si el proxy lo deja
 * entrar y, si no, a la primera sección que sí puede abrir. Nunca a una ruta
 * que el proxy rebotaría al Home.
 */
const user = (permissions: string[]) => ({ role: "user", permissions }) as never;
const group = (key: string) => {
  const found = appRouteGroups.find((g) => g.key === key);
  if (!found) throw new Error(`grupo ${key} no existe`);
  return found;
};

test.describe("getModuleEntryHref", () => {
  test("con el código de módulo lleva a la portada", () => {
    expect(getModuleEntryHref(group("wms"), user(["R-WMS"]))).toBe("/wms");
    expect(getModuleEntryHref(group("sales"), user(["R-CRM"]))).toBe("/sales");
    expect(getModuleEntryHref(group("finance"), user(["R-CONTABILIDAD"]))).toBe("/finance");
  });

  test("con solo un código de sección lleva a esa sección", () => {
    expect(getModuleEntryHref(group("wms"), user(["R-WMS-PICKING"]))).toBe("/wms/picking");
    expect(getModuleEntryHref(group("sales"), user(["R-CRM-PEDIDOS"]))).toBe("/sales/orders");
    expect(getModuleEntryHref(group("procurement"), user(["R-COMPRAS-PROV"]))).toBe("/procurement/suppliers");
    expect(getModuleEntryHref(group("manufacturing"), user(["R-PRODUCCION-CM"]))).toBe("/manufacturing/corte-manga");
    expect(getModuleEntryHref(group("finance"), user(["R-CONTABILIDAD-CXC"]))).toBe("/finance/accounts-receivable");
    expect(getModuleEntryHref(group("operations"), user(["R-MESACONTROL-CLIENTES"]))).toBe("/operations/customers");
  });

  test("Panel de Control: R-CORE-REPORTES sigue entrando a la portada (EC-626)", () => {
    expect(getModuleEntryHref(group("system"), user(["R-CORE-REPORTES"]))).toBe("/system");
    expect(getModuleEntryHref(group("system"), user(["R-CORE"]))).toBe("/system");
  });

  test("admin siempre a la portada; sin códigos del módulo, null", () => {
    expect(getModuleEntryHref(group("wms"), { role: "admin", permissions: [] } as never)).toBe("/wms");
    expect(getModuleEntryHref(group("wms"), user(["R-CRM"]))).toBeNull();
    expect(getModuleEntryHref(group("wms"), null)).toBeNull();
  });

  // Con cualquier código suelto que hace visible el módulo, el destino existe,
  // el proxy lo deja abrir y es la primera hoja que el sidebar y la portada del
  // módulo le muestran (mismo orden), así que el usuario aterriza "arriba".
  for (const g of appRouteGroups) {
    test(`${g.key}: cada código de entrada tiene un destino abrible`, () => {
      for (const code of getGroupAccessPermissions(g)) {
        const u = user([code]);
        const href = getModuleEntryHref(g, u);
        expect(href, code).not.toBeNull();
        expect(canAccessRoute(href as string, u), code).toBe(true);
        if (href !== g.modulePath) {
          const sections = getVisibleRouteSections(g, u);
          const firstShown = sections ? sections[0]?.items[0]?.path : href;
          expect(href, code).toBe(firstShown);
        }
      }
    });
  }
});

test.describe("item de módulo del sidebar global (EC-813)", () => {
  const moduleHref = (permissions: string[], label: string, pathname = "/") =>
    getSidebarItems(user(permissions), pathname)
      .flatMap((section) => section.items)
      .find((item) => item.label === label)?.href;

  test("con solo una sección lleva a esa sección, también desde Configuración", () => {
    expect(moduleHref(["R-WMS-PICKING"], group("wms").moduleLabel)).toBe("/wms/picking");
    expect(moduleHref(["R-CRM-PEDIDOS"], group("sales").moduleLabel, "/config")).toBe("/sales/orders");
  });

  test("con el código de módulo, o R-CORE-REPORTES en el Panel de Control, a la portada", () => {
    expect(moduleHref(["R-WMS"], group("wms").moduleLabel)).toBe("/wms");
    expect(moduleHref(["R-CORE-REPORTES"], group("system").moduleLabel)).toBe("/system");
  });

  test("con solo el código de una hoja oculta el módulo no se ofrece", () => {
    expect(getGroupAccessPermissions(group("sales"))).not.toContain("C-CRM-COTIZACIONES");
    expect(moduleHref(["C-CRM-COTIZACIONES"], group("sales").moduleLabel)).toBeUndefined();
  });
});
