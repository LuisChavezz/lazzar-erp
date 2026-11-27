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
      // EC-914: la hoja "Documentos" la ve cualquiera que vea el pedido.
      expect(resolveOrderDetailSheet("documents", { canSeeHistory })).toBe("documents");
      expect(resolveOrderDetailSheet("constructor", { canSeeHistory })).toBe("order");
    }
  });

  test("history solo con permiso; sin él cae en order", () => {
    expect(resolveOrderDetailSheet("history", { canSeeHistory: true })).toBe("history");
    expect(resolveOrderDetailSheet("history", { canSeeHistory: false })).toBe("order");
    expect(availableOrderDetailSheets(false)).toEqual(["order", "progress", "documents"]);
    expect(availableOrderDetailSheets(true)).toEqual(["order", "progress", "documents", "history"]);
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

  test("la devolución a proveedor se abre con R-WMS-RECEPCIONES", () => {
    expect(
      resolveDocumentAuditTarget(event("devolucion_proveedor"), user(["R-WMS-RECEPCIONES"]))?.opener,
    ).toEqual({ kind: "dialog", gatePath: "/wms/supplier-returns" });
    expect(resolveDocumentAuditTarget(event("devolucion_proveedor"), user(["R-WMS-CALIDAD"]))).toBeNull();
  });

  test("el encuadre RFID se abre con R-WMS-RECEPCIONES", () => {
    expect(
      resolveDocumentAuditTarget(event("encuadre_rfid"), user(["R-WMS-RECEPCIONES"]))?.opener,
    ).toEqual({ kind: "dialog", gatePath: "/wms/rfid-reconciliations" });
    expect(resolveDocumentAuditTarget(event("encuadre_rfid"), user(["R-WMS-SCANNER"]))).toBeNull();
  });

  test("diálogo solo con acceso a la pantalla donde vive", () => {
    expect(resolveDocumentAuditTarget(event("picking"), user(["R-WMS-PICKING"]))?.opener.kind).toBe(
      "dialog",
    );
    expect(resolveDocumentAuditTarget(event("picking"), user(["R-CORE"]))).toBeNull();
  });

  test("los once tipos sin detalle por id quedan como texto", () => {
    const admin = { role: "admin", permissions: [] } as never;
    for (const tipo of [
      "factura_proveedor",
      "cobro",
      "pago",
      "poliza",
      "ajuste_inventario",
      // EC-947: los que el backend ya registraba y el front no listaba.
      "salida_maquila",
      "despacho",
      "nota_credito",
      "movimiento_bancario",
      "conciliacion_bancaria",
      "calidad_inspeccion",
    ]) {
      expect(resolveDocumentAuditTarget(event(tipo), admin)).toBeNull();
    }
  });

  test("los trece abribles tienen destino para un admin", () => {
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
      // EC-951: el detalle de la devolución, en su pantalla de WMS.
      "devolucion_proveedor",
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
