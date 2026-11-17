import { expect, test } from "@playwright/test";
import { productionOrderDetailPath } from "@/src/constants/workOrderRoutes";
import { canOpenOrderDocument } from "@/src/features/orders/constants/orderDocumentAccess";
import { SERVICE_STEPS } from "@/src/features/special-orders/constants/serviceSteps";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { purchaseOrderDetailHref } from "@/src/features/purchase-orders/constants/purchaseOrderDetailOrigins";

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

test.describe("pedido 360°: surtido, embarque, OC y cotización siguen abiertos (EC-895)", () => {
  // El backend los sirve a quien ve el pedido (sin código de sección): solo se
  // condicionan las órdenes de Producción, cuyo detalle sí exige su código.
  const soloPedidos = user(["R-CRM-PEDIDOS"]);

  test("con solo R-CRM-PEDIDOS se abren los cuatro diálogos", () => {
    for (const tipo of ["picking", "packing", "orden_compra", "cotizacion"]) {
      expect(canOpenOrderDocument(tipo, 5, soloPedidos)).toBe(true);
    }
  });

  test("con el mismo perfil, las órdenes de Producción quedan como texto", () => {
    for (const tipo of ["orden_produccion", "orden_bordado", "orden_reflejante", "orden_corte_manga"]) {
      expect(canOpenOrderDocument(tipo, 5, soloPedidos)).toBe(false);
    }
  });
});

test.describe("pre-orden y OP: enlaces a pre-órdenes y a órdenes de compra (EC-895)", () => {
  test("la pre-orden de una OP solo enlaza con R-PRODUCCION", () => {
    expect(canAccessRoute("/manufacturing/pre-orders/41", user(["R-PRODUCCION-OP"]))).toBe(false);
    expect(canAccessRoute("/manufacturing/pre-orders/41", user(["R-PRODUCCION", "R-PRODUCCION-OP"]))).toBe(true);
  });

  test("las OC de una pre-orden solo enlazan con R-COMPRAS-OC", () => {
    expect(canAccessRoute(purchaseOrderDetailHref(7), soloModulo)).toBe(false);
    expect(canAccessRoute(purchaseOrderDetailHref(7), user(["R-PRODUCCION", "R-COMPRAS-OC"]))).toBe(true);
  });
});
