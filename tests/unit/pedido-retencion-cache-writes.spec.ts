import { expect, test } from "@playwright/test";
import { QueryClient } from "@tanstack/react-query";
import { applyPedidoRetencionResult } from "@/src/features/orders/utils/pedidoRetencionCache";
import { orderDespachoCancelDialogContent } from "@/src/features/orders/utils/orderDespachoCancel";
import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";
import type { PedidoRetencionResponse } from "@/src/features/orders/interfaces/pedido-retencion.interface";
import type { PedidoDocumentos } from "@/src/features/orders/interfaces/pedido-documentos.interface";
import type { Shipment } from "@/src/features/shipping/interfaces/shipping.interface";

/**
 * EC-946: lo que `retener/`/`liberar/` y "Cancelar envío" desde Documentos
 * escriben en caché con la respuesta del backend ANTES de invalidar (EC-927).
 * Mismo esquema que `wms-cancel-cache-writes.spec.ts`: cada escritor corre
 * contra un `QueryClient` sembrado. Corren con `npm run test:unit`.
 */

const row = (id: number, retenido = false) =>
  ({ id, folio: `P-${id}`, estatus: 3, retenido, motivo_retencion: retenido ? "VIEJO" : "", piezas: 10 }) as PedidoListItem;

const RETENIDO: PedidoRetencionResponse = {
  id: 7,
  folio: "P-7",
  retenido: true,
  motivo_retencion: "CRÉDITO VENCIDO",
  fecha_retencion: "2026-11-25T17:00:00Z",
  retenido_por: 4,
  retenido_por_nombre: "Ana Mesa",
};

test("retener: escribe bandera y motivo en cada página {results} y lista completa, y fusiona el detalle", async () => {
  const qc = new QueryClient();
  const pageKey = ["orders", "list", { page: 1 }];
  const otherPageKey = ["orders", "list", { page: 2 }];
  const fullKey = ["orders", "full"];
  const kpisKey = ["orders", "kpis-mesa", {}];
  const kpis = { total: 2 };
  qc.setQueryData(pageKey, { count: 3, results: [row(7), row(8)] });
  qc.setQueryData(otherPageKey, { count: 3, results: [row(9)] });
  qc.setQueryData(fullKey, [row(7), row(9)]);
  qc.setQueryData(kpisKey, kpis);
  qc.setQueryData(["pedido-detail", 7], { id: 7, folio: "P-7", estatus: 3, detalles: [{ id: 1 }], retenido: false });

  await applyPedidoRetencionResult(qc, 7, RETENIDO);

  const page = qc.getQueryData<{ count: number; results: PedidoListItem[] }>(pageKey)!;
  expect(page.count).toBe(3);
  expect(page.results[0]).toMatchObject({ id: 7, retenido: true, motivo_retencion: "CRÉDITO VENCIDO", piezas: 10 });
  // El listado no trae fecha ni quién: no se escriben en la fila.
  expect(page.results[0]).not.toHaveProperty("fecha_retencion");
  expect(page.results[1]).toEqual(row(8));
  expect(qc.getQueryData<PedidoListItem[]>(fullKey)![0]).toMatchObject({ id: 7, retenido: true });
  expect(qc.getQueryData(otherPageKey)).toEqual({ count: 3, results: [row(9)] });
  expect(qc.getQueryData(kpisKey)).toBe(kpis);
  expect(qc.getQueryData(["pedido-detail", 7])).toEqual({
    id: 7,
    folio: "P-7",
    estatus: 3,
    detalles: [{ id: 1 }],
    retenido: true,
    motivo_retencion: "CRÉDITO VENCIDO",
    fecha_retencion: "2026-11-25T17:00:00Z",
    retenido_por: 4,
    retenido_por_nombre: "Ana Mesa",
  });
});

test("liberar: deja la fila y el detalle sin retención", async () => {
  const qc = new QueryClient();
  const pageKey = ["orders", "list", {}];
  qc.setQueryData(pageKey, { count: 1, results: [row(7, true)] });
  qc.setQueryData(["pedido-detail", 7], { id: 7, retenido: true, motivo_retencion: "VIEJO", retenido_por_nombre: "Ana" });

  await applyPedidoRetencionResult(qc, 7, {
    id: 7,
    folio: "P-7",
    retenido: false,
    motivo_retencion: "",
    fecha_retencion: null,
    retenido_por: null,
    retenido_por_nombre: null,
  });

  expect(qc.getQueryData<{ results: PedidoListItem[] }>(pageKey)!.results[0]).toMatchObject({
    retenido: false,
    motivo_retencion: "",
  });
  expect(qc.getQueryData(["pedido-detail", 7])).toMatchObject({
    retenido: false,
    motivo_retencion: "",
    fecha_retencion: null,
    retenido_por_nombre: null,
  });
});

test("una respuesta de otro pedido no escribe nada", async () => {
  const qc = new QueryClient();
  const page = { count: 1, results: [row(7)] };
  const detail = { id: 7, retenido: false };
  qc.setQueryData(["orders", "list", {}], page);
  qc.setQueryData(["pedido-detail", 7], detail);

  await applyPedidoRetencionResult(qc, 7, { ...RETENIDO, id: 8 });

  expect(qc.getQueryData(["orders", "list", {}])).toBe(page);
  expect(qc.getQueryData(["pedido-detail", 7])).toBe(detail);
});

test("cancelar envío desde Documentos: reemplaza la fila del listado de envíos y escribe la del pedido", async () => {
  const qc = new QueryClient();
  const docs = {
    despachos: [
      { id: 54, guia: "", envio_id: 3, packing_id: 9, packing_folio: "PACK-9", estado: "ACTIVO", motivo_cancelacion: "" },
      { id: 55, guia: "", envio_id: 3, packing_id: 10, packing_folio: "PACK-10", estado: "ACTIVO", motivo_cancelacion: "" },
    ],
  } as unknown as PedidoDocumentos;
  qc.setQueryData(["pedido-documentos", 2129], docs);
  const shipmentRow = { id: 54, estado: "ACTIVO", packing_folio: "PACK-9", despacho_detalle: [] } as unknown as Shipment;
  qc.setQueryData(["shipments", "list", {}], { count: 1, results: [shipmentRow] });

  const response = {
    ...shipmentRow,
    estado: "CANCELADO",
    motivo_cancelacion: "GUÍA EQUIVOCADA",
  } as unknown as Shipment;
  await orderDespachoCancelDialogContent(2129, { id: 54, packing_folio: "PACK-9" }).action.applyResult(qc, response);

  expect(qc.getQueryData<{ results: Shipment[] }>(["shipments", "list", {}])!.results[0]).toEqual(response);
  const after = qc.getQueryData<PedidoDocumentos>(["pedido-documentos", 2129])!;
  expect(after.despachos[0]).toMatchObject({ id: 54, estado: "CANCELADO", motivo_cancelacion: "GUÍA EQUIVOCADA" });
  expect(after.despachos[1]).toBe(docs.despachos[1]);
});

test("cancelar envío desde Documentos: sin los documentos de ese pedido en caché no crea nada", async () => {
  const qc = new QueryClient();
  const response = { id: 54, estado: "CANCELADO", packing_folio: "PACK-9", despacho_detalle: [] } as unknown as Shipment;
  await orderDespachoCancelDialogContent(2129, { id: 54, packing_folio: "PACK-9" }).action.applyResult(qc, response);
  expect(qc.getQueryData(["pedido-documentos", 2129])).toBeUndefined();
});
