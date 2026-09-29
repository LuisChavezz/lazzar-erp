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
 * Invalida dos llaves, porque crear una orden cambia datos de ambas respuestas:
 *  - `["corte-manga-orders"]` — el listado, donde aparece la orden nueva.
 *  - `["corte-manga-onboarding"]` — el catálogo del alta: cada pedido trae su
 *    detalle por talla con `cantidad_asignada`/`cantidad_pendiente`, que la
 *    orden recién creada consume. Mismo criterio que `useCreateEmbroideryOrder`
 *    y `useCreateReflectiveOrder`.
 */
export const useCreateCorteMangaOrder = (
  onServerError?: (parsed: ParsedCorteMangaOrderError) => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCorteMangaOrder,
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["corte-manga-orders"] });
      queryClient.invalidateQueries({ queryKey: ["corte-manga-onboarding"] });
      toast.success(`Orden de corte de manga ${order.folio_ocm} creada correctamente`);
    },
    onError: (error) => {
      const parsed = parseCorteMangaOrderError(error);
      onServerError?.(parsed);

      // El 409 nombra una orden EXISTENTE cuyo id el aviso de duplicado
      // convierte en un enlace al diálogo de detalle, que la resuelve contra la
      // lista en caché. Esa orden puede haberla creado otro usuario después del
      // último fetch (el `staleTime` global del listado es de 15 min) o ser una fila
      // histórica de la generación automática desde ventas, en cuyo caso no
      // estaría en caché y el detalle diría "no existe o no tienes acceso"
      // sobre una orden que el backend acaba de confirmar. Refrescar el listado
      // aquí es lo que hace que ese enlace pueda resolver — ES la búsqueda
      // contra la lista de la que depende el bloque ámbar.
      //
      // El catálogo del alta también se invalida: el 409 dice justamente que
      // el pedido ya está cubierto, y un pedido cubierto al 100% deja de salir
      // en el onboarding (ver `CorteMangaOnboardingPedido`). Sin esto el pedido
      // seguiría en el selector y reenviar daría el mismo 409.
      if (parsed.duplicate) {
        queryClient.invalidateQueries({ queryKey: ["corte-manga-orders"] });
        queryClient.invalidateQueries({ queryKey: ["corte-manga-onboarding"] });
      }

      const toastMessage =
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? CORTE_MANGA_ORDER_GENERIC_ERROR;
      toast.error(toastMessage);
    },
  });
};
