import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { handleDrfWriteError, isNotFoundError } from "@/src/utils/drfWriteErrors";
import { updatePurchaseOrderCriticalPath } from "../services/actions";
import type { PurchaseOrderCriticalPathUpdateBody } from "../interfaces/purchase-order-critical-path.interface";
import {
  PURCHASE_ORDER_CRITICAL_PATH_FORM_FIELDS,
  type PurchaseOrderCriticalPathField,
} from "../schemas/purchase-order-critical-path.schema";
import { purchaseOrderCriticalPathKey } from "./usePurchaseOrderCriticalPath";

export type SetPurchaseOrderCriticalPathFieldError = (
  field: PurchaseOrderCriticalPathField,
  message: string,
) => void;

/** 404: la OC no existe, está inactiva o es de otra empresa (el backend no distingue). */
export const PURCHASE_ORDER_CRITICAL_PATH_NOT_FOUND_MESSAGE =
  "No se encontró la orden de compra. Puede que ya no exista o que no pertenezca a tu empresa.";

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
 * Errores: un 400 de DRF pinta cada mensaje bajo su campo
 * (`handleDrfWriteError`) y uno de un campo que el formulario no muestra llega
 * al toast; un 404 dice que la OC no se encontró. El backend no responde 409
 * ni bloquea por estatus. Red y 5xx caen al respaldo.
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
      toast.error(
        isNotFoundError(error)
          ? PURCHASE_ORDER_CRITICAL_PATH_NOT_FOUND_MESSAGE
          : handleDrfWriteError(
              error,
              "No se pudo guardar la ruta crítica.",
              PURCHASE_ORDER_CRITICAL_PATH_FORM_FIELDS,
              setFieldError,
            ),
      );
    },
  });
};
