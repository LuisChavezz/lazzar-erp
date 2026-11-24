import type { WmsCancelDialogContent } from "@/src/features/wms-cancellations/components/WmsCancelDialog";
import { mergeCachedRecord, replaceCachedRow } from "@/src/utils/cachedRows";
import type { WmsCancelAction } from "@/src/features/wms-cancellations/hooks/useWmsCancelMutation";
import { cancelPacking } from "../services/actions";
import type { Packing } from "../interfaces/packing.interface";

/** ¿El embarque está cancelado? */
export const isPackingCancelled = (packing: Pick<Packing, "estado">): boolean => packing.estado === "CANCELADO";

/** Candado por embarque. */
export const cancelPackingMutationKey = (packingId: number) => ["cancelar-packing", packingId] as const;

/**
 * Cancelar un embarque (EC-945). La respuesta es el `PackingSerializer`, la
 * forma del listado y del detalle: reemplaza la fila de `["packings"]` (lo que
 * muestra `PackingDetailDialog` desde el listado) y el detalle por id
 * (`["packing-detail", id]`, el del pedido 360° y la bitácora).
 */
export const packingCancelAction = (packingId: number): WmsCancelAction<Packing> => ({
  mutationKey: cancelPackingMutationKey(packingId),
  run: (motivo) => cancelPacking({ id: packingId, motivo }),
  applyResult: async (queryClient, packing) => {
    await replaceCachedRow<Packing>(queryClient, ["packings"], packing, ["id", "estado", "folio", "packing_detalle"]);
    if (packing?.id === packingId) {
      await mergeCachedRecord(queryClient, ["packing-detail", packingId], packingId, { ...packing });
    }
  },
  successMessage: (packing) => `Embarque ${packing?.folio || `#${packingId}`} cancelado`,
  fallbackErrorMessage: "Error al cancelar el embarque",
});

/** Texto del diálogo de "Cancelar embarque". */
export const packingCancelDialogContent = (
  packing: Pick<Packing, "id" | "folio">,
): WmsCancelDialogContent<Packing> => ({
  action: packingCancelAction(packing.id),
  title: "Cancelar embarque",
  description: `El embarque ${packing.folio || `#${packing.id}`} quedará cancelado y su surtido volverá a quedar por empacar. No mueve inventario.`,
  submitLabel: "Cancelar embarque",
  pendingLabel: "Cancelando…",
  motivoPlaceholder: "Explica por qué se cancela el embarque",
});
