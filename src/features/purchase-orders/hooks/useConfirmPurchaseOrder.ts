import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchCachedRowById } from "@/src/utils/cachedRows";
import { confirmPurchaseOrder } from "../services/actions";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
import { invalidateReceiptOrderOptions } from "../utils/invalidateReceiptOrderOptions";
import { serverTableListPrefix } from "@/src/utils/serverTableParams";
import { PURCHASE_ORDERS_KEY } from "./usePurchaseOrdersTable";
import { purchaseOrderReceiptKpisQueryKey } from "@/src/features/purchase-order-receipts/hooks/usePurchaseOrderReceiptKpis";
import toast from "react-hot-toast";
import { toastDrfError } from "@/src/utils/toastDrfError";

/**
 * Confirma (autoriza) una orden de compra: `POST /compras/ordenes/{id}/aceptar/`.
 *
 * En el éxito, la fila se escribe con la respuesta ANTES de invalidar: si ese
 * refetch falla, el listado conserva lo cargado y la orden seguiría ofreciendo
 * "Confirmar" (EC-927). SOLO `estatus`, `folio` y `fecha_autorizacion`: esta
 * respuesta no filtra importes por rol y trae el progreso en `null`.
 *
 * En el error también se invalida el listado: un 400 como
 * `{ "estatus": "La orden ya no puede aceptarse." }` dice que la fila en
 * caché está vieja, y sin refetch seguiría ofreciendo la acción.
 */
export const useConfirmPurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ordenCompraId: number) => confirmPurchaseOrder(ordenCompraId),
    onSuccess: async ({ orden_compra: { id, estatus, folio, fecha_autorizacion } }) => {
      await patchCachedRowById<PurchaseOrder>(queryClient, serverTableListPrefix(PURCHASE_ORDERS_KEY), id, (row) => ({
        ...row,
        estatus,
        folio,
        fecha_autorizacion,
      }));
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-order-onboarding"],
      });
      // Confirmada = autorizada = recibible: debe aparecer en el alta de recepción.
      invalidateReceiptOrderOptions(queryClient);
      // Autorizada entra al cumplimiento de cantidad de Recepciones.
      queryClient.invalidateQueries({ queryKey: purchaseOrderReceiptKpisQueryKey });
      toast.success("Orden de compra confirmada correctamente");
    },
    onError: (error) => {
      toastDrfError(error, "Error al confirmar la orden de compra");
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });
};
