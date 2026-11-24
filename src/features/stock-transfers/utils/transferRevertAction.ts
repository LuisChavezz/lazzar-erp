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
