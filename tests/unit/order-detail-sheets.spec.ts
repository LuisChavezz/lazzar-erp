import { expect, test } from "@playwright/test";
import {
  availableOrderDetailSheets,
  buildOrderDetailSheetHref,
  resolveOrderDetailSheet,
} from "@/src/features/orders/constants/orderDetailSheets";
import { resolveDocumentAuditTarget } from "@/src/features/document-audit/constants/documentAuditOpeners";

/** EC-854: tercera hoja "Historial", solo con permiso de la bitácora. */
test.describe("hojas del detalle de pedido", () => {
  test("los enlaces de siempre siguen resolviendo igual", () => {
    for (const canSeeHistory of [true, false]) {
      expect(resolveOrderDetailSheet(undefined, { canSeeHistory })).toBe("order");
      expect(resolveOrderDetailSheet("order", { canSeeHistory })).toBe("order");
      expect(resolveOrderDetailSheet("progress", { canSeeHistory })).toBe("progress");
      expect(resolveOrderDetailSheet("constructor", { canSeeHistory })).toBe("order");
    }
  });

  test("history solo con permiso; sin él cae en order", () => {
    expect(resolveOrderDetailSheet("history", { canSeeHistory: true })).toBe("history");
    expect(resolveOrderDetailSheet("history", { canSeeHistory: false })).toBe("order");
    expect(availableOrderDetailSheets(false)).toEqual(["order", "progress"]);
    expect(availableOrderDetailSheets(true)).toEqual(["order", "progress", "history"]);
  });

  test("cambiar de hoja conserva from y quita la hoja por defecto", () => {
    expect(buildOrderDetailSheetHref("/orders/5", { from: "operations" }, "history")).toBe(
      "/orders/5?from=operations&sheet=history",
    );
    expect(
      buildOrderDetailSheetHref("/orders/5", { from: "operations", sheet: "history" }, "order"),
    ).toBe("/orders/5?from=operations");
  });
});

test.describe("destino de un evento de la bitácora", () => {
  const user = (permissions: string[]) => ({ role: "user", permissions }) as never;
  const event = (tipo_documento: string, accion = "estatus", documento_id = "12") => ({
    tipo_documento,
    documento_id,
    accion,
  });

  test("página por id cuando el usuario puede abrirla", () => {
    const target = resolveDocumentAuditTarget(event("factura"), user(["R-CONTABILIDAD"]));
    expect(target?.opener.kind).toBe("route");
    expect(resolveDocumentAuditTarget(event("factura"), user(["R-CORE"]))).toBeNull();
  });

  test("diálogo solo con acceso a la pantalla donde vive", () => {
    expect(resolveDocumentAuditTarget(event("picking"), user(["R-WMS-PICKING"]))?.opener.kind).toBe(
      "dialog",
    );
    expect(resolveDocumentAuditTarget(event("picking"), user(["R-CORE"]))).toBeNull();
  });

  test("los cinco tipos sin detalle por id quedan como texto", () => {
    const admin = { role: "admin", permissions: [] } as never;
    for (const tipo of ["factura_proveedor", "cobro", "pago", "poliza", "ajuste_inventario"]) {
      expect(resolveDocumentAuditTarget(event(tipo), admin)).toBeNull();
    }
  });

  test("los doce abribles tienen destino para un admin", () => {
    const admin = { role: "admin", permissions: [] } as never;
    for (const tipo of [
      "pedido",
      "orden_compra",
      "recepcion",
      "orden_produccion",
      "orden_bordado",
      "orden_reflejante",
      "orden_corte_manga",
      "picking",
      "packing",
      "transferencia",
      "factura",
      "movimiento_inventario",
    ]) {
      expect(resolveDocumentAuditTarget(event(tipo), admin), tipo).not.toBeNull();
    }
  });

  test("un borrado, un id no numérico o un tipo desconocido no se abren", () => {
    const admin = { role: "admin", permissions: [] } as never;
    expect(resolveDocumentAuditTarget(event("pedido", "eliminar"), admin)).toBeNull();
    expect(resolveDocumentAuditTarget(event("pedido", "estatus", "abc"), admin)).toBeNull();
    expect(resolveDocumentAuditTarget(event("cotizacion"), admin)).toBeNull();
  });

  test("el pedido vuelve a la bitácora", () => {
    const admin = { role: "admin", permissions: [] } as never;
    const target = resolveDocumentAuditTarget(event("pedido"), admin);
    expect(target?.opener.kind === "route" && target.opener.href(target.id)).toBe(
      "/orders/12?from=document-audit",
    );
  });
});
