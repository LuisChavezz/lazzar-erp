import { expect, test } from "@playwright/test";
import { QueryClient } from "@tanstack/react-query";
import {
  isQualityInspectionRevertible,
  qualityRevertAction,
  QUALITY_REVERT_BLOCKING_KEYS,
} from "@/src/features/quality-inspections/utils/qualityRevertAction";
import {
  classifyWmsCancelError,
  wmsCancelErrorClosesDialog,
} from "@/src/features/wms-cancellations/utils/wmsCancelErrors";

const badRequest = (data: unknown) => ({ isAxiosError: true, response: { status: 400, data } });

// EC-947: `POST calidad-inspecciones/{id}/revertir/` (solo admin).
test.describe("revertir calidad", () => {
  test("solo una inspección no anulada con su recepción Cerrada (5)", () => {
    expect(isQualityInspectionRevertible({ estado: "aprobada" }, 5)).toBe(true);
    expect(isQualityInspectionRevertible({ estado: "rechazada" }, 5)).toBe(true);
    expect(isQualityInspectionRevertible({ estado: "anulada" }, 5)).toBe(false);
    expect(isQualityInspectionRevertible({ estado: "aprobada" }, 4)).toBe(false);
    expect(isQualityInspectionRevertible({ estado: "aprobada" }, 6)).toBe(false);
    // Sin la recepción a la mano (aún no carga): no se ofrece.
    expect(isQualityInspectionRevertible({ estado: "aprobada" }, undefined)).toBe(false);
  });

  test("escribe la inspección anulada y la recepción en En calidad antes de invalidar", async () => {
    const queryClient = new QueryClient();
    const listKey = ["quality-inspections", "list"];
    queryClient.setQueryData(listKey, [
      { id: 7, recepcion: 40, estado: "aprobada", estado_label: "Aprobada", aprobadas: 3 },
      { id: 8, recepcion: 41, estado: "aprobada", estado_label: "Aprobada" },
    ]);
    queryClient.setQueryData(["receipts"], [{ id: 40, estatus: 5, folio: "RC-1" }]);

    queryClient.setQueryData(["receipt-detail", 40], { id: 40, estatus: 5, estatus_label: "Cerrada", detalles: [] });
    queryClient.setQueryData(["purchase-orders", "list", {}], { count: 1, results: [{ id: 90, estatus: 5, estatus_label: "Recibida" }] });
    queryClient.setQueryData(["purchase-orders", 90], { id: 90, estatus: 5, estatus_label: "Recibida", detalles: [] });

    const action = qualityRevertAction({ id: 7, recepcion: 40, recepcion_folio: "RC-1" }, 90);
    await action.applyResult(queryClient, {
      calidad_inspeccion: {
        id: 7,
        estado: "anulada",
        estado_label: "Anulada",
        motivo_anulacion: "Liberada por error",
        fecha_anulacion: "2026-11-25T10:00:00Z",
        anulada_por: 3,
      } as never,
      recepcion_estatus: 4,
      orden_compra_estatus: 4,
      movimiento_id: 1,
      movimiento_inventario_id: 2,
    });

    const rows = queryClient.getQueryData(listKey) as Record<string, unknown>[];
    expect(rows[0]).toMatchObject({ id: 7, estado: "anulada", motivo_anulacion: "Liberada por error", aprobadas: 3 });
    expect(rows[1]).toMatchObject({ id: 8, estado: "aprobada" });
    expect((queryClient.getQueryData(["receipts"]) as { estatus: number }[])[0].estatus).toBe(4);
    expect(queryClient.getQueryData(["receipt-detail", 40])).toMatchObject({ estatus: 4, estatus_label: "En calidad", detalles: [] });
    expect((queryClient.getQueryData(["purchase-orders", "list", {}]) as { results: unknown[] }).results[0]).toMatchObject({
      id: 90,
      estatus: 4,
      estatus_label: "Parcialmente recibida",
    });
    expect(queryClient.getQueryData(["purchase-orders", 90])).toMatchObject({ estatus: 4, detalles: [] });
  });

  test("sin el id de la OC solo escribe la inspección y la recepción", async () => {
    const queryClient = new QueryClient();
    const detail = { id: 90, estatus: 5 };
    queryClient.setQueryData(["purchase-orders", 90], detail);
    const action = qualityRevertAction({ id: 7, recepcion: 40, recepcion_folio: "RC-1" });
    await action.applyResult(queryClient, {
      calidad_inspeccion: { id: 7, estado: "anulada" } as never,
      recepcion_estatus: 4,
      orden_compra_estatus: 4,
      movimiento_id: null,
      movimiento_inventario_id: null,
    });
    expect(queryClient.getQueryData(["purchase-orders", 90])).toBe(detail);
  });

  test("applyResult no invalida: las invalidaciones van en refresh, sin esperarse", async () => {
    const queryClient = new QueryClient();
    const invalidated: unknown[] = [];
    queryClient.invalidateQueries = ((filters: { queryKey: unknown }) => {
      invalidated.push(filters.queryKey);
      return new Promise(() => {}); // un refetch que nunca termina
    }) as never;
    const action = qualityRevertAction({ id: 7, recepcion: 40, recepcion_folio: "RC-1" });
    await action.applyResult(queryClient, { calidad_inspeccion: { id: 7, estado: "anulada" } as never, recepcion_estatus: 4, orden_compra_estatus: null, movimiento_id: null, movimiento_inventario_id: null });
    expect(invalidated).toEqual([]);
    action.refresh?.(queryClient);
    expect(invalidated).toContainEqual(["quality-inspections"]);
    expect(invalidated).toContainEqual(["receipts"]);
    expect(invalidated).toContainEqual(["purchase-orders"]);
  });

  test("los 400 de negocio de revertir/ cierran el diálogo con el mensaje tal cual", () => {
    for (const key of QUALITY_REVERT_BLOCKING_KEYS) {
      const message = `mensaje de ${key}`;
      const classified = classifyWmsCancelError(badRequest({ [key]: message }), "x", QUALITY_REVERT_BLOCKING_KEYS);
      expect(classified, key).toEqual({ kind: "blocked", message });
      expect(wmsCancelErrorClosesDialog(classified)).toBe(true);
    }
  });

  test("sin las llaves extra, las cancelaciones de WMS siguen igual", () => {
    expect(classifyWmsCancelError(badRequest({ existencia: "sin stock" }), "x").kind).toBe("other");
    expect(classifyWmsCancelError(badRequest({ packing: "cancela el packing" }), "x").kind).toBe("blocked");
  });

  test("una respuesta con otra forma no escribe nada ni lanza", async () => {
    const queryClient = new QueryClient();
    const list = [{ id: 7, recepcion: 40, estado: "aprobada" }];
    queryClient.setQueryData(["quality-inspections", "list"], list);
    const action = qualityRevertAction({ id: 7, recepcion: 40, recepcion_folio: "RC-1" });
    await action.applyResult(queryClient, {} as never);
    expect(queryClient.getQueryData(["quality-inspections", "list"])).toBe(list);
  });
});
