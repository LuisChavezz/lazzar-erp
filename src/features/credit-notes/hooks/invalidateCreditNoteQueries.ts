import type { QueryClient } from "@tanstack/react-query";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";

/**
 * Refresca todo lo que una mutación de nota de crédito (alta, emisión,
 * cancelación, borrado, timbrado) puede dejar obsoleto:
 *
 * - la nota: listado (`["credit-notes"]`) y retrieve (`["credit-note-detail"]`);
 * - la factura: listado (`["invoices"]`), retrieve (`["invoice-detail"]`) y
 *   desglose (`["invoice-desglose"]`, que trae sus notas de crédito);
 * - la cuenta por cobrar: listas (`["accounts-receivable"]`) y detalle
 *   (`["accounts-receivable-detail"]`), cuyo saldo baja al emitir y sube al
 *   cancelar;
 * - el avance del pedido (`invalidatePedidoProgress`).
 *
 * Por RAÍZ y no por id: los errores no traen la factura y una invalidación solo
 * vuelve a pedir lo montado. Se llama en `onSettled`, también ante un error: el
 * PAC pudo timbrar aunque la respuesta se perdiera, y releer es lo seguro.
 *
 * La promesa espera solo a la nota, para que el diálogo de confirmación siga
 * "pendiente" hasta que el listado y el detalle reflejen el resultado; el resto
 * se refresca sin bloquearlo.
 */
export const invalidateCreditNoteQueries = (queryClient: QueryClient) => {
  void Promise.all([
    queryClient.invalidateQueries({ queryKey: ["invoices"] }),
    queryClient.invalidateQueries({ queryKey: ["invoice-detail"] }),
    queryClient.invalidateQueries({ queryKey: ["invoice-desglose"] }),
    queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] }),
    queryClient.invalidateQueries({ queryKey: ["accounts-receivable-detail"] }),
    invalidatePedidoProgress(queryClient),
  ]);
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["credit-notes"] }),
    queryClient.invalidateQueries({ queryKey: ["credit-note-detail"] }),
  ]);
};
