import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createReflectiveOrder } from "../services/actions";
import {
  REFLECTIVE_ORDER_GENERIC_ERROR,
  parseReflectiveOrderError,
  type ParsedReflectiveOrderError,
} from "../utils/parseReflectiveOrderError";

// El normalizador vive en `utils/` por ser una función pura (ver el archivo);
// se re-exporta aquí para que el punto de importación coincida con el de
// `useCreateEmbroideryOrder`.
export {
  parseReflectiveOrderError,
  type ParsedReflectiveOrderError,
  type ReflectiveOrderErrorField,
  type ReflectiveDuplicateExistingOrder,
} from "../utils/parseReflectiveOrderError";

/**
 * Mutación de alta de orden de reflejante. `onServerError` recibe el error ya
 * normalizado para que el formulario lo reparta entre el banner y los campos.
 *
 * El toast de éxito usa el `folio_reflejante` de la RESPUESTA —nunca
 * `preview.folio_or_sugerido` del onboarding, que se calcula con la sucursal
 * por defecto del usuario y puede no coincidir con la serie realmente consumida
 * (la de la sucursal del pedido).
 *
 * Invalida `["reflective-orders"]` (el listado). NO invalida
 * `["reflective-onboarding"]`: crear una orden no saca al pedido del catálogo
 * —el backend no excluye los pedidos que ya tienen OR— así que la respuesta
 * sería idéntica y el refetch, desperdiciado.
 */
export const useCreateReflectiveOrder = (
  onServerError?: (parsed: ParsedReflectiveOrderError) => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReflectiveOrder,
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["reflective-orders"] });
      toast.success(`Orden de reflejante ${order.folio_reflejante} creada correctamente`);
    },
    onError: (error) => {
      const parsed = parseReflectiveOrderError(error);
      onServerError?.(parsed);

      // El 409 nombra una orden EXISTENTE cuyo id el aviso de duplicado
      // convierte en un enlace al diálogo de detalle, que la resuelve contra la
      // lista en caché. Esa orden puede haberla creado otro usuario después del
      // último fetch (el `staleTime` global es de 15 min) o venir de la
      // generación automática desde ventas, en cuyo caso no estaría en caché y
      // el detalle diría "no existe o no tienes acceso" sobre una orden que el
      // backend acaba de confirmar. Refrescar el listado aquí es lo que hace
      // que ese enlace pueda resolver.
      if (parsed.duplicate) {
        queryClient.invalidateQueries({ queryKey: ["reflective-orders"] });
      }

      const toastMessage =
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? REFLECTIVE_ORDER_GENERIC_ERROR;
      toast.error(toastMessage);
    },
  });
};
