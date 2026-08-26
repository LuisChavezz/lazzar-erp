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
// `parseShipmentError`/`parseStockTransferError`, que sí viven en su hook.
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
 * La mutación acepta `detalles_override` sin cambio de firma: es un campo
 * opcional de `CreateEmbroideryOrderPayload`, así que el alta de un solo paso
 * que existe hoy sigue llamándola exactamente igual.
 *
 * Invalida TRES llaves, porque crear una orden cambia datos que viven en las
 * tres respuestas:
 *  - `["embroidery-orders"]` — el listado, donde aparece la orden nueva y se
 *    recalcula la cobertura de su pedido.
 *  - `["embroidery-onboarding"]` — el catálogo del alta: la orden consume saldo
 *    del pedido (`cantidad_asignada` sube, `cantidad_pendiente` baja) y, si lo
 *    cubre al 100%, el backend saca al pedido de la lista. Sin invalidar, el
 *    siguiente alta ofrecería líneas ya programadas.
 *  - `["embroidery-order-detail"]` — el detalle de las OTRAS órdenes del mismo
 *    pedido. Su respuesta es CRUZADA: `otras_ordenes_del_pedido` gana una
 *    hermana y el `cantidad_asignada`/`cantidad_pendiente` de cada línea se
 *    mueve en cuanto cualquier otra OB programa piezas de esa talla. Se
 *    invalida el prefijo (sin id), así que alcanza a todas las que haya en
 *    caché. Sin esto, el `staleTime` global de 15 min servía el detalle
 *    anterior sin volver a pedirlo: reabrir una orden justo después de crear
 *    otra sobre el mismo pedido mostraba un saldo que ya no era cierto —
 *    justo el dato que ese diálogo existe para enseñar.
 */
export const useCreateEmbroideryOrder = (
  onServerError?: (parsed: ParsedEmbroideryOrderError) => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEmbroideryOrder,
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["embroidery-orders"] });
      queryClient.invalidateQueries({ queryKey: ["embroidery-onboarding"] });
      // Prefijo sin id: alcanza el detalle de CUALQUIER orden en caché, que es
      // justo lo que hace falta —la que cambia es la hermana, no la recién
      // creada—. Ver el bloque de arriba.
      queryClient.invalidateQueries({ queryKey: ["embroidery-order-detail"] });
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

      // El 400 de exceso significa que el saldo por línea que se le ofreció al
      // usuario ya no es el real (otra OB del mismo pedido lo consumió entre
      // la carga y el envío). Invalidar el onboarding es lo que hace que el
      // reintento parta de `cantidad_pendiente` fresco en vez de repetir el
      // mismo rechazo — mismo tratamiento que el `staleData` de picking.
      if (parsed.excessLines) {
        queryClient.invalidateQueries({ queryKey: ["embroidery-onboarding"] });
      }

      // UNA sola frase, nunca `messages.join("\n")`: desde que el parser
      // reconoce `detalles_exceso`, `messages` incluye el desglose línea por
      // línea del backend (`- talla_id=3 pedido_detalle_id=12: pedido=10.0,
      // ya_asignado=4.0, ...`), texto de diagnóstico que en un toast efímero de
      // esquina es ilegible. Ese desglose ya se pinta —completo y con formato—
      // en el banner del Paso 2; aquí basta el motivo. Mismo criterio que el
      // toast de picking.
      const toastMessage =
        parsed.formError ?? parsed.messages[0] ?? EMBROIDERY_ORDER_GENERIC_ERROR;
      toast.error(toastMessage);
    },
  });
};
