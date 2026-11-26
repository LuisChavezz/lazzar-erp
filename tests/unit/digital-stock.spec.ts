import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import { appRouteGroups, getGroupAccessPermissions } from "@/src/constants/appRoutes";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { hasAnyPermission } from "@/src/utils/permissions";
import { readServerTableState, toServerTableCriteria } from "@/src/utils/serverTableParams";
import { digitalStockTable } from "@/src/features/digital-stock/constants/digitalStockTable";
import { digitalStockErrorMessage } from "@/src/features/digital-stock/utils/digitalStockErrors";

/** EC-977: stock digital por SKU en Ventas y en Mesa de Control. */

const user = (...permissions: string[]) => ({ role: "user", permissions }) as never;
const admin = { role: "admin", permissions: [] } as never;

const SALES = "/sales/digital-stock";
const OPERATIONS = "/operations/digital-stock";

const groupVisible = (key: string, profile: { role: string; permissions: string[] }) => {
  const group = appRouteGroups.find((candidate) => candidate.key === key)!;
  return profile.role === "admin" || hasAnyPermission(getGroupAccessPermissions(group), profile as never);
};

test.describe("acceso por módulo", () => {
  for (const code of ["R-CRM", "R-CRM-COTIZACIONES", "R-CRM-PEDIDOS"]) {
    test(`${code} abre la de Ventas y no la de Mesa de Control`, () => {
      expect(canAccessRoute(SALES, user(code))).toBe(true);
      expect(canAccessRoute(OPERATIONS, user(code))).toBe(false);
    });
  }

  for (const code of ["R-MESACONTROL", "R-MESACONTROL-COTI", "R-MESACONTROL-PEDIDOS"]) {
    test(`${code} abre la de Mesa de Control y no la de Ventas`, () => {
      expect(canAccessRoute(OPERATIONS, user(code))).toBe(true);
      expect(canAccessRoute(SALES, user(code))).toBe(false);
    });
  }

  test("admin abre las dos; otros módulos ninguna", () => {
    expect(canAccessRoute(SALES, admin)).toBe(true);
    expect(canAccessRoute(OPERATIONS, admin)).toBe(true);
    for (const code of ["R-WMS", "R-COMPRAS", "R-PRODUCCION", "R-CRM-CLIENTES"]) {
      expect(canAccessRoute(SALES, user(code))).toBe(false);
      expect(canAccessRoute(OPERATIONS, user(code))).toBe(false);
    }
  });

  test("la hoja no abre el módulo hermano a quien no tiene sus códigos", () => {
    // Sin códigos mezclados, solo CRM no ve Mesa de Control ni al revés.
    expect(groupVisible("operations", { role: "user", permissions: ["R-CRM-PEDIDOS"] })).toBe(false);
    expect(groupVisible("sales", { role: "user", permissions: ["R-MESACONTROL-PEDIDOS"] })).toBe(false);
    expect(groupVisible("sales", { role: "user", permissions: ["R-CRM-COTIZACIONES"] })).toBe(true);
  });
});

test.describe("definición del listado", () => {
  const criteriaOf = (query: string) => {
    const params = new URLSearchParams(query);
    return toServerTableCriteria(
      digitalStockTable,
      readServerTableState(digitalStockTable, (key) => params.get(key)),
    );
  };

  test("lleva solo, ids y búsqueda al backend; nada de ordering", () => {
    expect(criteriaOf("solo=faltantes&categoria=2&color=3&talla=4&sucursal=5&q=pla")).toEqual({
      solo: "faltantes",
      categoria: "2",
      color: "3",
      talla: "4",
      sucursal: "5",
      q: "pla",
    });
  });

  test("un valor inválido en la URL se trata como ausente", () => {
    expect(criteriaOf("solo=otro&talla=abc&sucursal=0&ordering=-sku")).toEqual({});
  });
});

test.describe("digitalStockErrorMessage", () => {
  const axiosError = (status: number, data: unknown) =>
    new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
      status,
      statusText: "",
      headers: {},
      config: { headers: new AxiosHeaders() },
      data,
    });

  test("un 400 por campo muestra los mensajes del backend tal cual", () => {
    expect(
      digitalStockErrorMessage(axiosError(400, { sucursal: "No es una sucursal de tu empresa." })),
    ).toBe("No es una sucursal de tu empresa.");
    expect(
      digitalStockErrorMessage(
        axiosError(400, { solo: "Usa uno de: disponibles.", talla: ["Debe ser un entero válido."] }),
      ),
    ).toBe("Usa uno de: disponibles. · Debe ser un entero válido.");
  });

  test("un 403 muestra su detail", () => {
    expect(
      digitalStockErrorMessage(
        axiosError(403, { detail: "No tienes permiso para consultar esta información." }),
      ),
    ).toBe("No tienes permiso para consultar esta información.");
  });

  test("otros errores dejan el mensaje de siempre", () => {
    expect(digitalStockErrorMessage(axiosError(500, { detail: "x" }))).toBeUndefined();
    expect(digitalStockErrorMessage(axiosError(400, "<html>"))).toBeUndefined();
    expect(digitalStockErrorMessage(new Error("x"))).toBeUndefined();
  });
});
