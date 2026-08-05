import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createCorteMangaOrder } from "../services/actions";
import {
  CORTE_MANGA_ORDER_GENERIC_ERROR,
  parseCorteMangaOrderError,
  type ParsedCorteMangaOrderError,
} from "../utils/parseCorteMangaOrderError";

// El normalizador vive en `utils/` por ser una función pura (ver el archivo);
// se re-exporta aquí para que el punto de importación coincida con el de
// `useCreateReflectiveOrder`.
export {
  parseCorteMangaOrderError,
  type ParsedCorteMangaOrderError,
  type CorteMangaOrderErrorField,
  type CorteMangaDuplicateExistingOrder,
} from "../utils/parseCorteMangaOrderError";

/**
 * Mutación de alta de orden de corte de manga. `onServerError` recibe el error
 * ya normalizado para que el formulario lo reparta entre el banner y los campos.
 *
 * El toast de éxito usa el `folio_ocm` de la RESPUESTA —nunca
 * `preview.folio_ocm_sugerido` del onboarding, que se calcula con la sucursal
 * por defecto del usuario y puede no coincidir con la serie realmente consumida
 * (la de la sucursal del pedido).
 *
 * Invalida `["corte-manga-orders"]` (el listado). NO invalida
 * `["corte-manga-onboarding"]`: crear una orden no saca al pedido del catálogo
 * —el backend no excluye los pedidos que ya tienen OCM— así que la respuesta
 * sería idéntica y el refetch, desperdiciado.
 */
export const useCreateCorteMangaOrder = (
  onServerError?: (parsed: ParsedCorteMangaOrderError) => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCorteMangaOrder,
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["corte-manga-orders"] });
      toast.success(`Orden de corte de manga ${order.folio_ocm} creada correctamente`);
    },
    onError: (error) => {
      const parsed = parseCorteMangaOrderError(error);
      onServerError?.(parsed);

      // El 409 nombra una orden EXISTENTE cuyo id el aviso de duplicado
      // convierte en un enlace al diálogo de detalle, que la resuelve contra la
      // lista en caché. Esa orden puede haberla creado otro usuario después del
      // último fetch (el `staleTime` global es de 15 min) o ser una fila
      // histórica de la generación automática desde ventas, en cuyo caso no
      // estaría en caché y el detalle diría "no existe o no tienes acceso"
      // sobre una orden que el backend acaba de confirmar. Refrescar el listado
      // aquí es lo que hace que ese enlace pueda resolver — ES la búsqueda
      // contra la lista de la que depende el bloque ámbar.
      if (parsed.duplicate) {
        queryClient.invalidateQueries({ queryKey: ["corte-manga-orders"] });
      }

      const toastMessage =
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? CORTE_MANGA_ORDER_GENERIC_ERROR;
      toast.error(toastMessage);
    },
  });
};
