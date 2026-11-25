import { expect, test } from "@playwright/test";
import { QueryClient } from "@tanstack/react-query";
import {
  isQualityInspectionRevertible,
  qualityRevertAction,
} from "@/src/features/quality-inspections/utils/qualityRevertAction";

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

    const action = qualityRevertAction({ id: 7, recepcion: 40, recepcion_folio: "RC-1" });
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
