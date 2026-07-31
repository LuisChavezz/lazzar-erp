import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createEmbroideryOrder } from "../services/actions";
import {
  EMBROIDERY_ORDER_GENERIC_ERROR,
  parseEmbroideryOrderError,
  type ParsedEmbroideryOrderError,
} from "../utils/parseEmbroideryOrderError";

// El normalizador vive en `utils/` por ser una función pura (ver el archivo);
// se re-exporta aquí para que el punto de importación coincida con el de
// `parseDispatchError`/`parseStockTransferError`, que sí viven en su hook.
export {
  parseEmbroideryOrderError,
  type ParsedEmbroideryOrderError,
  type EmbroideryOrderErrorField,
  type EmbroideryDuplicateExistingOrder,
} from "../utils/parseEmbroideryOrderError";

/**
 * Mutación de alta de orden de bordado. `onServerError` recibe el error ya
 * normalizado para que el formulario lo reparta entre el banner y los campos.
 *
 * El toast de éxito usa el `folio_bordado` de la RESPUESTA —nunca
 * `preview.folio_ob_sugerido` del onboarding, que se calcula con la sucursal
 * por defecto del usuario y puede no coincidir con la serie realmente
 * consumida (la de la sucursal del pedido).
 *
 * Invalida `["embroidery-orders"]` (el listado). NO invalida
 * `["embroidery-onboarding"]`: crear una orden no saca al pedido del catálogo
 * —el backend no excluye los pedidos que ya tienen OB— así que la respuesta
 * sería idéntica y el refetch, desperdiciado.
 */
export const useCreateEmbroideryOrder = (
  onServerError?: (parsed: ParsedEmbroideryOrderError) => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEmbroideryOrder,
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["embroidery-orders"] });
      toast.success(`Orden de bordado ${order.folio_bordado} creada correctamente`);
    },
    onError: (error) => {
      const parsed = parseEmbroideryOrderError(error);
      onServerError?.(parsed);

      // El 409 nombra una orden EXISTENTE cuyo id el aviso de duplicado
      // convierte en un enlace al diálogo de detalle, que la resuelve contra
      // la lista en caché. Esa orden puede haberla creado otro usuario después
      // del último fetch (el `staleTime` global es de 15 min), en cuyo caso no
      // estaría en caché y el detalle diría "no existe o no tienes acceso"
      // sobre una orden que el backend acaba de confirmar. Refrescar el
      // listado aquí es lo que hace que ese enlace pueda resolver.
      if (parsed.duplicate) {
        queryClient.invalidateQueries({ queryKey: ["embroidery-orders"] });
      }

      const toastMessage =
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? EMBROIDERY_ORDER_GENERIC_ERROR;
      toast.error(toastMessage);
    },
  });
};
