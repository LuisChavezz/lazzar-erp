import type { QueryClient } from "@tanstack/react-query";
import { fetchFresh } from "@/src/hooks/useMutationLock";
import type { NotaCredito } from "../interfaces/credit-note.interface";
import { getNotaCredito } from "../services/actions";

/**
 * Retrieve FRESCO de la nota antes de una acción irreversible (timbrar,
 * cancelar, emitir): el listado puede tener hasta 15 minutos y otra sesión
 * pudo emitirla, timbrarla o cancelarla. Queda escrito en
 * `["credit-note-detail", id]`, así que el detalle por id también se pone al
 * día. Si falla, lanza `PrecheckError` con el motivo listo para el toast.
 */
export const fetchFreshNotaCredito = (
  queryClient: QueryClient,
  notaId: number,
): Promise<NotaCredito> =>
  fetchFresh(
    queryClient,
    ["credit-note-detail", notaId],
    () => getNotaCredito(notaId),
    "No se pudo consultar la nota de crédito.",
  );
