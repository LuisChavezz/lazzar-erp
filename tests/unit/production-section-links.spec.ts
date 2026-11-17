import { expect, test } from "@playwright/test";
import { productionOrderDetailPath } from "@/src/constants/workOrderRoutes";
import { canOpenOrderDocument } from "@/src/features/orders/constants/orderDocumentAccess";
import { SERVICE_STEPS } from "@/src/features/special-orders/constants/serviceSteps";
import { canAccessRoute } from "@/src/utils/routeAccess";

/**
 * EC-895: lo que enlaza a una orden de Producción desde fuera de su sección
 * solo la abre con el permiso de esa sección (la regla de su ruta); sin él se
 * pinta como texto. El admin ve todo.
 */
const user = (permissions: string[]) => ({ role: "user", permissions }) as never;
const admin = { role: "admin", permissions: [] } as never;
const soloBordado = user(["R-PRODUCCION", "R-PRODUCCION-OB"]);
const soloModulo = user(["R-PRODUCCION"]);

test.describe("pedido 360°: diálogos de Documentos relacionados y trazabilidad", () => {
  test("cada orden de trabajo exige su sección", () => {
    expect(canOpenOrderDocument("orden_bordado", 5, soloBordado)).toBe(true);
    expect(canOpenOrderDocument("orden_produccion", 5, soloBordado)).toBe(false);
    expect(canOpenOrderDocument("orden_reflejante", 5, soloBordado)).toBe(false);
    expect(canOpenOrderDocument("orden_corte_manga", 5, soloBordado)).toBe(false);
  });

  test("R-PRODUCCION solo no abre ninguna orden de trabajo", () => {
    for (const tipo of ["orden_produccion", "orden_bordado", "orden_reflejante", "orden_corte_manga"]) {
      expect(canOpenOrderDocument(tipo, 5, soloModulo)).toBe(false);
      expect(canOpenOrderDocument(tipo, 5, admin)).toBe(true);
    }
  });

  test("los tipos sin sección propia no cambian", () => {
    for (const tipo of ["picking", "packing", "orden_compra", "cotizacion", "movimiento_inventario"]) {
      expect(canOpenOrderDocument(tipo, 5, user(["R-CRM-PEDIDOS"]))).toBe(true);
    }
    // Un `tipo` heredado de Object.prototype no resuelve a una ruta.
    expect(canOpenOrderDocument("constructor", 5, user([]))).toBe(true);
  });
});

test.describe("Fabricación Especial: servicios", () => {
  test("bordado, reflejante y corte de manga enlazan según su sección", () => {
    expect(canAccessRoute(SERVICE_STEPS.bordado.href(3), soloBordado)).toBe(true);
    expect(canAccessRoute(SERVICE_STEPS.reflejante.href(3), soloBordado)).toBe(false);
    expect(canAccessRoute(SERVICE_STEPS.corte_manga.href(3), soloBordado)).toBe(false);
    expect(canAccessRoute(SERVICE_STEPS.corte_manga.href(3), user(["R-PRODUCCION-CM"]))).toBe(true);
    expect(canAccessRoute(SERVICE_STEPS.reflejante.href(3), admin)).toBe(true);
  });
});

test.describe("OP desde Fabricación Especial y Pre-órdenes", () => {
  test("el folio de OP enlaza solo con R-PRODUCCION-OP", () => {
    expect(canAccessRoute(productionOrderDetailPath(9), soloModulo)).toBe(false);
    expect(canAccessRoute(productionOrderDetailPath(9), soloBordado)).toBe(false);
    expect(canAccessRoute(productionOrderDetailPath(9), user(["R-PRODUCCION", "R-PRODUCCION-OP"]))).toBe(true);
    expect(canAccessRoute(productionOrderDetailPath(9), admin)).toBe(true);
  });
});
