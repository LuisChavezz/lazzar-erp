import type { WmsCancelDialogContent } from "@/src/features/wms-cancellations/components/WmsCancelDialog";
import { mergeCachedRecord, replaceCachedRow } from "@/src/utils/cachedRows";
import type { WmsCancelAction } from "@/src/features/wms-cancellations/hooks/useWmsCancelMutation";
import { revertTransferencia, type RevertTransferenciaResult } from "../services/actions";
import type { TransferenciaListItem } from "../interfaces/stock-transfer.interface";

/**
 * ¿Se ofrece "Revertir"? (EC-945): TR `COMPLETADA` que no es una reversa ni fue
 * revertida. El resto de las reglas (manual o de un surtido ya cancelado, la
 * última de su cadena) las aplica el backend y su `400` se muestra tal cual.
 */
export const isTransferRevertible = (
  transfer: Pick<TransferenciaListItem, "status" | "reversa_de" | "reversa">,
): boolean => transfer.status === "COMPLETADA" && !transfer.reversa_de && !transfer.reversa;

/** Candado por TR. */
export const revertTransferMutationKey = (transferId: number) => ["revertir-transferencia", transferId] as const;

/**
 * Revertir una TR (EC-945). `original` y `reversa` llegan en la forma del
 * listado: la original reemplaza su fila en `["transferencias"]` y se fusiona
 * en su detalle (que conserva sus líneas). La reversa es una fila NUEVA: su
 * lugar en la lista lo decide el refetch.
 */
export const transferRevertAction = (transferId: number): WmsCancelAction<RevertTransferenciaResult> => ({
  mutationKey: revertTransferMutationKey(transferId),
  run: (motivo) => revertTransferencia({ id: transferId, motivo }),
  applyResult: async (queryClient, result) => {
    const original = result?.original;
    await replaceCachedRow<TransferenciaListItem>(queryClient, ["transferencias"], original, ["id", "folio", "status"]);
    if (original?.id === transferId) {
      await mergeCachedRecord(queryClient, ["transferencia-detail", transferId], transferId, { ...original });
    }
  },
  successMessage: (result) =>
    result?.reversa?.folio ? `Traspaso revertido con ${result.reversa.folio}` : "Traspaso revertido",
  fallbackErrorMessage: "Error al revertir el traspaso",
});

/** Texto del diálogo de "Revertir traspaso". */
export const transferRevertDialogContent = (
  transfer: Pick<TransferenciaListItem, "id" | "folio" | "almacen_origen_nombre" | "almacen_destino_nombre">,
): WmsCancelDialogContent<RevertTransferenciaResult> => ({
  action: transferRevertAction(transfer.id),
  title: "Revertir traspaso",
  description: `Se creará un traspaso inverso, de ${transfer.almacen_destino_nombre} a ${transfer.almacen_origen_nombre}, con las mismas piezas, y ${transfer.folio || `#${transfer.id}`} quedará cancelado.`,
  submitLabel: "Revertir traspaso",
  pendingLabel: "Revirtiendo…",
  motivoPlaceholder: "Explica por qué se revierte el traspaso",
});
