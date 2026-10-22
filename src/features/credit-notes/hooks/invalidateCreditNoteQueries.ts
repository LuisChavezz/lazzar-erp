import type { QueryClient } from "@tanstack/react-query";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";

/**
 * Qué cambió la mutación, de menos a más:
 *
 * - `stamp` (timbrar): solo el timbre de la nota, que únicamente pintan el
 *   listado y el detalle de notas. El desglose de la factura lista sus notas
 *   SIN campos de timbrado.
 * - `document` (alta de borrador, borrado): además, qué notas tiene la factura,
 *   que lista su desglose (`["invoice-desglose"]`, cualquier estatus).
 * - `balances` (alta emitida, emisión, cancelación): además, el saldo de la
 *   cuenta por cobrar (baja al emitir, sube al cancelar), lo que de él muestran
 *   la factura (listado y retrieve) y el avance del pedido.
 */
export type CreditNoteChangeScope = "stamp" | "document" | "balances";

/**
 * Refresca lo que una mutación de nota de crédito deja obsoleto según su
 * `scope` (ver `CreditNoteChangeScope`).
 *
 * Por RAÍZ y no por id: los errores no traen la factura y una invalidación solo
 * vuelve a pedir lo montado. Se llama en `onSettled`, también ante un error:
 * emitir y timbrar llaman a Facturama, que pudo timbrar aunque la respuesta se
 * perdiera, y releer es lo seguro.
 *
 * La promesa espera solo a la nota, para que el diálogo de confirmación siga
 * "pendiente" hasta que el listado y el detalle reflejen el resultado; el resto
 * se refresca sin bloquearlo.
 */
export const invalidateCreditNoteQueries = (
  queryClient: QueryClient,
  scope: CreditNoteChangeScope,
) => {
  if (scope !== "stamp") {
    void queryClient.invalidateQueries({ queryKey: ["invoice-desglose"] });
  }
  if (scope === "balances") {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["invoices"] }),
      queryClient.invalidateQueries({ queryKey: ["invoice-detail"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable-detail"] }),
      invalidatePedidoProgress(queryClient),
    ]);
  }
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["credit-notes"] }),
    queryClient.invalidateQueries({ queryKey: ["credit-note-detail"] }),
  ]);
};
