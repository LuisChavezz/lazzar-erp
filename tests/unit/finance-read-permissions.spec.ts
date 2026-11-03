import { expect, test } from "@playwright/test";
import { appRouteGroups, getGroupAccessPermissions } from "@/src/constants/appRoutes";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { getSidebarItems } from "@/src/utils/getSidebarItems";
import { meetsPermissionRequirement } from "@/src/utils/permissions";
import { financeReadBlockReason, getFinanceReadState } from "@/src/utils/financeRead";
import {
  FINANCE_READ_PERMISSION,
  FINANCE_READ_REASONS,
  financeSectionReadPermissions,
} from "@/src/constants/financePermissions";

/**
 * Pruebas unitarias de EC-734: lectura JERÁRQUICA de Finanzas, la misma regla
 * que el backend (`PermisoFinanzas`, nucleo-erp EC-746). `R-CONTABILIDAD` abre
 * todo Finanzas; un subcódigo abre solo su sección. Un desajuste aquí se nota
 * como un rebote al Home (proxy) o un 403 del listado.
 */

const perfil = (...permissions: string[]) => ({ role: "user", permissions });
const soloModulo = perfil("R-CONTABILIDAD");
const soloFacturacion = perfil("R-CONTABILIDAD-FACTURACION");
const soloCxc = perfil("R-CONTABILIDAD-CXC");
const soloClientes = perfil("R-CONTABILIDAD-CLIENTES");
const facturacionYCxc = perfil("R-CONTABILIDAD-FACTURACION", "R-CONTABILIDAD-CXC");
const sinFinanzas = perfil("R-CRM");
const admin = { role: "admin", permissions: [] };

const SECCIONES = {
  facturacion: ["/finance/invoicing", "/finance/invoicing/12"],
  cxc: ["/finance/accounts-receivable", "/finance/collections"],
  clientes: ["/finance/accounting-customers"],
};
// Pantallas sin código de sección: solo `R-CONTABILIDAD`.
const SIN_SECCION = [
  "/finance",
  "/finance/credit-notes",
  "/finance/accounts-payable",
  "/finance/payments",
  "/finance/banks",
  "/finance/bank-accounts",
  "/finance/bank-reconciliations",
  "/finance/polizas",
  "/finance/chart-of-accounts",
  "/finance/cost-centers",
  "/finance/supplier-invoices",
];

const abre = (user: Parameters<typeof canAccessRoute>[1], paths: string[]) =>
  paths.map((path) => [path, canAccessRoute(path, user)] as const);
const todas = (paths: string[], value: boolean) => paths.map((path) => [path, value] as const);

test.describe("rutas de Finanzas (misma regla que el proxy)", () => {
  test("R-CONTABILIDAD abre todas las secciones y las pantallas sin sección", () => {
    const paths = [...Object.values(SECCIONES).flat(), ...SIN_SECCION];
    expect(abre(soloModulo, paths)).toEqual(todas(paths, true));
  });

  test("cada subcódigo abre solo su sección", () => {
    const { facturacion, cxc, clientes } = SECCIONES;
    expect(abre(soloFacturacion, facturacion)).toEqual(todas(facturacion, true));
    expect(abre(soloFacturacion, [...cxc, ...clientes, ...SIN_SECCION])).toEqual(
      todas([...cxc, ...clientes, ...SIN_SECCION], false),
    );
    expect(abre(soloCxc, cxc)).toEqual(todas(cxc, true));
    expect(abre(soloCxc, [...facturacion, ...clientes, ...SIN_SECCION])).toEqual(
      todas([...facturacion, ...clientes, ...SIN_SECCION], false),
    );
    expect(abre(soloClientes, clientes)).toEqual(todas(clientes, true));
    expect(abre(soloClientes, [...facturacion, ...cxc, ...SIN_SECCION])).toEqual(
      todas([...facturacion, ...cxc, ...SIN_SECCION], false),
    );
  });

  test("sin códigos de Finanzas no abre nada; el admin abre todo", () => {
    const paths = [...Object.values(SECCIONES).flat(), ...SIN_SECCION];
    expect(abre(sinFinanzas, paths)).toEqual(todas(paths, false));
    expect(abre(admin, paths)).toEqual(todas(paths, true));
  });

  test("las reglas de otros módulos no cambian: el módulo no abre sus secciones", () => {
    expect(canAccessRoute("/procurement/purchase-orders", perfil("R-COMPRAS"))).toBe(false);
    expect(canAccessRoute("/procurement/purchase-orders", perfil("R-COMPRAS-OC"))).toBe(true);
  });
});

test.describe("navegación de Finanzas", () => {
  const finance = appRouteGroups.find((group) => group.key === "finance")!;

  test("cada hoja declara el mismo requisito que la regla de su ruta", () => {
    for (const profile of [soloModulo, soloFacturacion, soloCxc, soloClientes, facturacionYCxc, sinFinanzas]) {
      for (const item of finance.items) {
        const visible = item.permission ? meetsPermissionRequirement(item.permission, profile) : true;
        expect([item.path, visible]).toEqual([item.path, canAccessRoute(item.path, profile)]);
      }
    }
  });

  test("la entrada al módulo se ofrece con R-CONTABILIDAD o con cualquier subcódigo", () => {
    const codes = getGroupAccessPermissions(finance);
    expect(codes).toEqual(
      expect.arrayContaining([
        "R-CONTABILIDAD",
        "R-CONTABILIDAD-FACTURACION",
        "R-CONTABILIDAD-CXC",
        "R-CONTABILIDAD-CLIENTES",
      ]),
    );
  });

  test("el sidebar del módulo lista las secciones según la regla jerárquica", () => {
    const hrefs = (user: typeof soloModulo) =>
      getSidebarItems(user, "/finance/invoicing")
        .flatMap((section) => section.items.map((item) => item.href))
        .filter((href) => href.startsWith("/finance/"));

    expect(hrefs(soloModulo)).toEqual(expect.arrayContaining([
      "/finance/invoicing",
      "/finance/accounts-receivable",
      "/finance/collections",
      "/finance/accounting-customers",
      "/finance/credit-notes",
    ]));
    expect(hrefs(soloFacturacion)).toEqual(["/finance/invoicing"]);
    expect(hrefs(soloCxc)).toEqual(["/finance/accounts-receivable", "/finance/collections"]);
    expect(hrefs(soloClientes)).toEqual(["/finance/accounting-customers"]);
    expect(hrefs(facturacionYCxc)).toEqual([
      "/finance/invoicing",
      "/finance/accounts-receivable",
      "/finance/collections",
    ]);
  });
});

test.describe("compuerta de lectura entre secciones (getFinanceReadState)", () => {
  const clientes = financeSectionReadPermissions("accountingCustomers");

  test("lee con el subcódigo de esa sección o con R-CONTABILIDAD; el admin siempre", () => {
    expect(getFinanceReadState(soloClientes, "authenticated", clientes).canRead).toBe(true);
    expect(getFinanceReadState(soloModulo, "authenticated", clientes).canRead).toBe(true);
    expect(getFinanceReadState(admin, "authenticated", clientes).canRead).toBe(true);
    expect(getFinanceReadState(soloCxc, "authenticated", clientes).canRead).toBe(false);
    expect(getFinanceReadState(soloCxc, "authenticated", FINANCE_READ_PERMISSION).canRead).toBe(false);
  });

  test("sin permiso da el motivo; mientras la sesión carga, bloquea sin motivo", () => {
    const motivo = FINANCE_READ_REASONS.accountingCustomers;
    expect(financeReadBlockReason(getFinanceReadState(soloCxc, "authenticated", clientes), motivo)).toBe(motivo);
    const cargando = getFinanceReadState(undefined, "loading", clientes);
    expect(cargando.canRead).toBe(false);
    expect(financeReadBlockReason(cargando, motivo)).toBeNull();
    expect(financeReadBlockReason(getFinanceReadState(soloModulo, "authenticated", clientes), motivo)).toBeNull();
  });
});
