"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { updatePedidoHeader } from "../services/actions";
import type { PedidoHeaderUpdate } from "../interfaces/pedido-update.interface";

/**
 * Claves del 400 que se muestran en el toast, en orden de prioridad. Mismo
 * criterio que `useProgramarPedido`, más las de campo: aquí no hay formulario
 * donde marcarlas, así que su mensaje también va al toast.
 *
 * - `permiso`: el cuerpo trae `clasificacion`/`fecha_confirmacion` y el usuario
 *   no es mesa de control — HTTP 400 con el mensaje plano bajo la clave, no un
 *   403.
 * - `detail`: `APIException` genéricos de DRF.
 * - `clasificacion` / `fecha_confirmacion` / `non_field_errors`: validación.
 */
const MESSAGE_KEYS = [
  "permiso",
  "detail",
  "clasificacion",
  "fecha_confirmacion",
  "non_field_errors",
] as const;

const FALLBACK_ERROR = "No se pudo actualizar el pedido";

/**
 * Mensaje de un cuerpo de error del PATCH, sea cual sea su estatus (400, 403…):
 *
 * - ARREGLO en la raíz (`["…"]`): `ValidationError("texto")` no ligado a campo.
 * - Objeto: las claves de `MESSAGE_KEYS` en orden (`detail` cubre el 403 de
 *   las clases de permiso de DRF) y, al final, el `{ error }` que usan otras
 *   vistas del backend.
 */
const extractMessage = (data: unknown): string | undefined => {
  if (Array.isArray(data)) {
    for (const entry of data) {
      const message = firstDrfMessage(entry);
      if (message) return message;
    }
    return undefined;
  }
  if (!data || typeof data !== "object") return undefined;
  const body = data as Record<string, unknown>;
  for (const key of MESSAGE_KEYS) {
    const message = firstDrfMessage(body[key]);
    if (message) return message;
  }
  return typeof body.error === "string" && body.error ? body.error : undefined;
};

type UpdatePedidoHeaderVariables = {
  pedidoId: number;
  payload: PedidoHeaderUpdate;
};

/**
 * Edición en línea de la cabecera del detalle de pedido (clasificación, fecha
 * de confirmación). Espeja `useProgramarPedido`.
 *
 * NUNCA `setQueryData` con la respuesta: el PATCH devuelve el detalle SIN el
 * filtro contable del `GET`. Se invalida y se vuelve a leer, lo que además trae
 * `fecha_entrega_min`/`max`, que el backend recalcula desde `clasificacion`.
 *
 * La mutación sigue PENDIENTE hasta que termina esa relectura del detalle
 * (`onSuccess` devuelve su promesa): así el control no se re-habilita mostrando
 * el valor viejo durante los segundos que tarda el GET. Si la relectura falla,
 * `invalidateQueries` no lanza (resuelve igual) y el pendiente termina. El
 * listado (`["orders"]`) se invalida sin esperar: no se ve en esta pantalla.
 *
 * Una instancia por CAMPO: cada una lleva su propio `isPending`, así que editar
 * la clasificación y luego la fecha muestra ambos en vuelo por separado.
 */
export const useUpdatePedidoHeader = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, UpdatePedidoHeaderVariables>({
    mutationFn: ({ pedidoId, payload }) => updatePedidoHeader(pedidoId, payload),
    onSuccess: async (_, { pedidoId, payload }) => {
      toast.success(
        "clasificacion" in payload
          ? "Clasificación del pedido actualizada"
          : "Fecha de confirmación del pedido actualizada",
      );
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["pedido-detail", pedidoId] });
    },
    onError: (error) => {
      let message: string | undefined;
      if (error instanceof AxiosError) {
        message = extractMessage(error.response?.data);
        // `get_object` acota por empresa: un pedido ajeno responde 404.
        if (error.response?.status === 404) {
          message = "El pedido no existe o no pertenece a tu empresa.";
        }
      }
      /* Sin `extractErrorMessage`: ante un cuerpo desconocido devolvería el
       * `message` de Axios ("Request failed with status code 403"), no un
       * texto en español. */
      toast.error(message ?? FALLBACK_ERROR);
    },
  });
};
