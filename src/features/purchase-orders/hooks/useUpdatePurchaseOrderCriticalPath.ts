import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updatePurchaseOrderCriticalPath } from "../services/actions";
import type { PurchaseOrderCriticalPathUpdateBody } from "../interfaces/purchase-order-critical-path.interface";
import type { PurchaseOrderCriticalPathField } from "../schemas/purchase-order-critical-path.schema";
import { purchaseOrderCriticalPathSaveErrorMessage } from "../utils/purchaseOrderCriticalPathErrors";
import { purchaseOrderCriticalPathKey } from "./usePurchaseOrderCriticalPath";

export type SetPurchaseOrderCriticalPathFieldError = (
  field: PurchaseOrderCriticalPathField,
  message: string,
) => void;

/**
 * Por OC: el diálogo de ESA orden lo usa (`useIsMutating`) para no cerrarse a
 * media petición.
 */
export const updatePurchaseOrderCriticalPathMutationKey = (ocId: number) =>
  ["purchase-order-critical-path-update", ocId] as const;

export interface UpdatePurchaseOrderCriticalPathVariables {
  ocId: number;
  body: PurchaseOrderCriticalPathUpdateBody;
}

/**
 * PATCH de la ruta crítica de la OC. No optimista: GET y PATCH comparten
 * forma, así que el registro que responde el servidor (con su `updated_at`) se
 * escribe directo en la caché en vez de volver a pedirlo.
 *
 * Errores (`purchaseOrderCriticalPathSaveErrorMessage`): un 400 de DRF pinta
 * cada mensaje bajo su campo y uno de un campo que el formulario no muestra
 * llega al toast; un 403 (sin `E-COMPRAS-OC`) dice que falta el permiso; un 404
 * dice que la OC no se encontró. El backend no responde 409 ni bloquea por
 * estatus. Red y 5xx caen al respaldo.
 */
export const useUpdatePurchaseOrderCriticalPath = (
  ocId: number,
  setFieldError?: SetPurchaseOrderCriticalPathFieldError,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: updatePurchaseOrderCriticalPathMutationKey(ocId),
    mutationFn: ({ ocId: id, body }: UpdatePurchaseOrderCriticalPathVariables) =>
      updatePurchaseOrderCriticalPath(id, body),
    onSuccess: (data, { ocId: id, body }) => {
      queryClient.setQueryData(purchaseOrderCriticalPathKey(id), data);
      // Un 200 no prueba que se guardó: el backend ignora en silencio lo que no
      // reconoce. Se compara lo enviado contra el registro que devolvió.
      const unapplied = (Object.keys(body) as (keyof typeof body)[]).filter(
        (field) => data[field] !== body[field],
      );
      if (unapplied.length > 0) {
        toast.error("El servidor no aplicó todos los cambios. Revisa los valores guardados.");
        return;
      }
      toast.success("Ruta crítica actualizada");
    },
    onError: (error) => {
      console.error(error);
      toast.error(purchaseOrderCriticalPathSaveErrorMessage(error, setFieldError));
    },
  });
};
