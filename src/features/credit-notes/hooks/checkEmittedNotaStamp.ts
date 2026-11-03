import type { QueryClient } from "@tanstack/react-query";
import type { EmittedNotaStampCheck } from "../utils/creditNoteErrors";
import { isCreditNoteStampPending } from "../utils/creditNoteStamping";
import { fetchFreshNotaCredito } from "./fetchFreshNotaCredito";

/**
 * Relee una nota que el `400` de la emisión reporta `Emitida` y dice si quedó
 * con el timbrado pendiente (EC-709). El estatus no basta: el backend responde
 * igual cuando Facturama no confirmó (`cfdi_pendiente`) y cuando el timbrado
 * salió y falló la póliza. Si la relectura falla, `unknown`: no se afirma nada.
 * La nota fresca queda en `["credit-note-detail", id]`. `read` existe para las
 * pruebas unitarias.
 */
export const checkEmittedNotaStamp = async (
  queryClient: QueryClient,
  notaId: number,
  read: typeof fetchFreshNotaCredito = fetchFreshNotaCredito,
): Promise<EmittedNotaStampCheck> => {
  try {
    const nota = await read(queryClient, notaId);
    return isCreditNoteStampPending(nota) ? "pending" : "not-pending";
  } catch {
    return "unknown";
  }
};
