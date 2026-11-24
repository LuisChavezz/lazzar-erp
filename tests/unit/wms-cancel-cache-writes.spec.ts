import { expect, test } from "@playwright/test";
import { QueryClient } from "@tanstack/react-query";
import { packingCancelAction } from "@/src/features/packing/utils/packingCancelAction";
import { pickingCancelAction } from "@/src/features/picking/utils/pickingCancelAction";
import { shipmentCancelAction } from "@/src/features/shipping/utils/shipmentCancelAction";
import { transferRevertAction } from "@/src/features/stock-transfers/utils/transferRevertAction";
import type { Packing } from "@/src/features/packing/interfaces/packing.interface";
import type { Picking, PickingListItem } from "@/src/features/picking/interfaces/picking.interface";
import type { Shipment } from "@/src/features/shipping/interfaces/shipping.interface";
import type { RevertTransferenciaResult } from "@/src/features/stock-transfers/services/actions";

/**
 * EC-945: lo que cada cancelación escribe en caché con la respuesta del backend
 * ANTES de invalidar (EC-927), para que un refetch fallido no deje el documento
 * ofreciendo la acción otra vez. Cada `applyResult` corre contra un
 * `QueryClient` con listas y detalles sembrados. Corren con `npm run test:unit`.
 */

const CANCELADO = {
  motivo_cancelacion: "PRUEBA",
  fecha_cancelacion: "2026-11-24T19:00:00Z",
  cancelado_por: 4,
  cancelado_por_nombre: "Luis",
};

test("surtido: parcha solo los campos de estado en cada página {results} y reemplaza su detalle", async () => {
  const qc = new QueryClient();
  const row = (id: number, piezas: number) => ({ id, folio: `PICK-${id}`, estado: "Completado", piezas }) as PickingListItem;
  const pageKey = ["pickings", "list", { page: 1 }];
  const otherPageKey = ["pickings", "list", { page: 2 }];
  const resumenKey = ["pickings", "resumen", {}];
  const resumen = { total: 2 };
  qc.setQueryData(pageKey, { count: 2, results: [row(5, 2), row(6, 3)] });
  qc.setQueryData(otherPageKey, { count: 2, results: [row(9, 1)] });
  qc.setQueryData(resumenKey, resumen);
  qc.setQueryData(["picking-detail", 5], { picking: { id: 5, estado: "Completado", picking_detalle: [] }, fetchedAt: 1 });

  const response = { id: 5, folio: "PICK-5", estado: "Cancelado", picking_detalle: [{ id: 1 }], ...CANCELADO } as unknown as Picking;
  await pickingCancelAction(5).applyResult(qc, response);

  const page = qc.getQueryData<{ count: number; results: PickingListItem[] }>(pageKey)!;
  expect(page.count).toBe(2);
  expect(page.results[0]).toEqual({ ...row(5, 2), estado: "Cancelado", ...CANCELADO });
  expect(page.results[1]).toEqual(row(6, 3));
  expect(qc.getQueryData(otherPageKey)).toEqual({ count: 2, results: [row(9, 1)] });
  expect(qc.getQueryData(resumenKey)).toBe(resumen);
  const detail = qc.getQueryData<{ picking: Picking; fetchedAt: number }>(["picking-detail", 5])!;
  expect(detail.picking).toEqual(response);
  expect(detail.fetchedAt).toBeGreaterThan(1);
});

test("embarque: reemplaza la fila del listado y fusiona el detalle por id", async () => {
  const qc = new QueryClient();
  const before = { id: 70, folio: "PACK-70", estado: "PENDIENTE", packing_detalle: [] } as unknown as Packing;
  const other = { id: 71, folio: "PACK-71", estado: "PENDIENTE", packing_detalle: [] } as unknown as Packing;
  qc.setQueryData(["packings"], [before, other]);
  qc.setQueryData(["packing-detail", 70], { ...before, observaciones: "sigue" });

  const response = { ...before, estado: "CANCELADO", ...CANCELADO } as Packing;
  await packingCancelAction(70).applyResult(qc, response);

  expect(qc.getQueryData<Packing[]>(["packings"])).toEqual([response, other]);
  expect(qc.getQueryData(["packing-detail", 70])).toEqual({ ...response, observaciones: "sigue" });
});

test("envío: reemplaza la fila en cada variante del listado (todos y ?estado=ACTIVO)", async () => {
  const qc = new QueryClient();
  const before = { id: 55, estado: "ACTIVO", packing_folio: "PACK-26", despacho_detalle: [] } as unknown as Shipment;
  const other = { id: 54, estado: "ACTIVO", packing_folio: "PACK-25", despacho_detalle: [] } as unknown as Shipment;
  qc.setQueryData(["shipments", null], [before, other]);
  qc.setQueryData(["shipments", "ACTIVO"], [before]);
  qc.setQueryData(["shipments", "CANCELADO"], []);

  const response = { ...before, estado: "CANCELADO", ...CANCELADO } as Shipment;
  await shipmentCancelAction(55).applyResult(qc, response);

  expect(qc.getQueryData(["shipments", null])).toEqual([response, other]);
  // Sigue en la variante filtrada hasta el refetch: la invalidación decide su lugar.
  expect(qc.getQueryData(["shipments", "ACTIVO"])).toEqual([response]);
  expect(qc.getQueryData(["shipments", "CANCELADO"])).toEqual([]);
});

test("envío: una respuesta con otra forma no escribe nada", async () => {
  const qc = new QueryClient();
  const before = { id: 55, estado: "ACTIVO", packing_folio: "PACK-26", despacho_detalle: [] } as unknown as Shipment;
  qc.setQueryData(["shipments", null], [before]);
  await shipmentCancelAction(55).applyResult(qc, { id: 55 } as Shipment);
  expect(qc.getQueryData(["shipments", null])).toEqual([before]);
});

test("traspaso: reemplaza solo la original en el listado y la fusiona en su detalle, que conserva sus líneas", async () => {
  const qc = new QueryClient();
  const original = { id: 44, folio: "TR-44", status: "COMPLETADA", reversa: null, reversa_folio: null };
  const otra = { id: 43, folio: "TR-43", status: "COMPLETADA" };
  qc.setQueryData(["transferencias"], [original, otra]);
  qc.setQueryData(["transferencia-detail", 44], { ...original, transferencia_detalle: [{ id: 1 }] });

  const result = {
    original: { ...original, status: "CANCELADA", reversa: 45, reversa_folio: "TR-45", ...CANCELADO },
    reversa: { id: 45, folio: "TR-45", status: "COMPLETADA", reversa_de: 44, reversa_de_folio: "TR-44" },
  } as unknown as RevertTransferenciaResult;
  await transferRevertAction(44).applyResult(qc, result);

  // La reversa es una fila nueva: su lugar lo decide el refetch, no se inserta.
  expect(qc.getQueryData(["transferencias"])).toEqual([result.original, otra]);
  expect(qc.getQueryData(["transferencia-detail", 44])).toEqual({
    ...result.original,
    transferencia_detalle: [{ id: 1 }],
  });
  expect(qc.getQueryData(["transferencia-detail", 45])).toBeUndefined();
});
