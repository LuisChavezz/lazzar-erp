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
 * La mutación acepta `detalles_override` sin cambio de firma: es un campo
 * opcional de `CreateReflectiveOrderPayload`.
 *
 * Invalida TRES llaves, porque crear una orden cambia datos que viven en las
 * tres respuestas:
 *  - `["reflective-orders"]` — el listado, donde aparece la orden nueva y se
 *    recalcula la cobertura de su pedido.
 *  - `["reflective-onboarding"]` — el catálogo del alta. Este hook NO lo
 *    invalidaba, con el argumento de que "el backend no excluye los pedidos que
 *    ya tienen OR": dejó de ser cierto. La orden consume saldo del pedido
 *    (`cantidad_asignada` sube, `cantidad_pendiente` baja) y, si lo cubre al
 *    100%, el backend saca al pedido de la lista. Sin invalidar, el siguiente
 *    alta ofrecería líneas ya programadas.
 *  - `["reflective-order-detail"]` — el detalle de las OTRAS órdenes del mismo
 *    pedido. Su respuesta es CRUZADA: `otras_ordenes_del_pedido` gana una
 *    hermana y el `cantidad_asignada`/`cantidad_pendiente` de cada línea se
 *    mueve en cuanto cualquier otra OR programa piezas de esa talla. Se invalida
 *    el prefijo (sin id), así que alcanza a todas las que haya en caché. Sin
 *    esto, el `staleTime` global de 15 min servía el detalle anterior sin volver
 *    a pedirlo: reabrir una orden justo después de crear otra sobre el mismo
 *    pedido mostraba un saldo que ya no era cierto — justo el dato que ese
 *    diálogo existe para enseñar.
 */
export const useCreateReflectiveOrder = (
  onServerError?: (parsed: ParsedReflectiveOrderError) => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReflectiveOrder,
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["reflective-orders"] });
      queryClient.invalidateQueries({ queryKey: ["reflective-onboarding"] });
      // Prefijo sin id: alcanza el detalle de CUALQUIER orden en caché, que es
      // justo lo que hace falta —la que cambia es la hermana, no la recién
      // creada—. Ver el bloque de arriba.
      queryClient.invalidateQueries({ queryKey: ["reflective-order-detail"] });
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

      // El 400 de exceso significa que el saldo por línea que se le ofreció al
      // usuario ya no es el real (otra OR del mismo pedido lo consumió entre la
      // carga y el envío). Invalidar el onboarding es lo que hace que el
      // reintento parta de `cantidad_pendiente` fresco en vez de repetir el
      // mismo rechazo — mismo tratamiento que en bordado y en picking.
      if (parsed.excessLines) {
        queryClient.invalidateQueries({ queryKey: ["reflective-onboarding"] });
      }

      // UNA sola frase, nunca `messages.join("\n")`: desde que el parser
      // reconoce `detalles_exceso`, `messages` incluye el desglose línea por
      // línea del backend (`- talla_id=3 pedido_detalle_id=12: pedido=10.0,
      // ya_asignado=4.0, ...`), texto de diagnóstico que en un toast efímero de
      // esquina es ilegible. Ese desglose ya se pinta —completo y con formato—
      // en el banner del Paso 2; aquí basta el motivo.
      const toastMessage =
        parsed.formError ?? parsed.messages[0] ?? REFLECTIVE_ORDER_GENERIC_ERROR;
      toast.error(toastMessage);
    },
  });
};
