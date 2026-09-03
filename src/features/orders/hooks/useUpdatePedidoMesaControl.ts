"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import {
  extractQuoteValidationIssues,
  type QuoteValidationIssue,
} from "@/src/features/quotes/utils/quoteValidationErrors";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { updatePedidoMesaControl } from "../services/actions";
import type {
  PedidoMesaControlUpdate,
  PedidoMesaControlUpdateResponse,
} from "../interfaces/pedido-mesa-control.interface";

/**
 * Claves de RECHAZO del endpoint: motivos que el usuario no puede corregir en
 * ningún campo del formulario y que por tanto tienen que llegarle en el toast.
 *
 * Las dos vienen como `ValidationError` de DRF — o sea **HTTP 400 con el
 * mensaje anidado bajo su clave**, no un 403 ni un `{ error }`:
 *
 * - `permiso`: `_require_mesa_control` — "Acción disponible solo para mesa de
 *   control." Es el caso del usuario que tiene `E-MESACONTROL-PEDIDOS` pero no
 *   el ROL `MESA-DE-CONTROL`, que es lo que el backend valida de verdad.
 * - `pedido` / `cotizacion`: el pedido no tiene cotización ligada (o se
 *   borró), así que no hay nada que espejar.
 *
 * `detail` cubre los `APIException` genéricos de DRF, por si aparece otro.
 * NO se incluyen las claves de campo (`detalle`, `pedido.cliente`…): esas ya
 * las pinta `onValidationError` sobre el input correspondiente y repetirlas en
 * el toast sería ruido.
 */
const REJECTION_KEYS = ["permiso", "cotizacion", "detail"] as const;

/**
 * Primer mensaje de rechazo del cuerpo 400, o `undefined` si el 400 es de
 * validación de campos. `firstDrfMessage` desenvuelve el `string | string[]`
 * con el que DRF serializa cada valor.
 */
const extractRejectionMessage = (data: unknown): string | undefined => {
  if (!data || typeof data !== "object") return undefined;
  const body = data as Record<string, unknown>;
  for (const key of REJECTION_KEYS) {
    const message = firstDrfMessage(body[key]);
    if (message) return message;
  }
  /* `pedido` es ambigua: la usa el rechazo por falta de cotización (string) y
   * también el bloque de errores de campo de la cabecera (objeto). Solo cuenta
   * como rechazo cuando trae un mensaje plano. */
  return firstDrfMessage(body.pedido);
};

type UpdatePedidoMesaControlVariables = {
  pedidoId: number;
  /**
   * PK de la cotización de origen. Se recibe para poder invalidar su caché: el
   * endpoint la MUTA en el mismo commit (la espeja campo a campo, la regresa a
   * `estatus = 3` y regraba su `aprobado_snapshot`), así que dejarla en caché
   * mostraría la cotización anterior en Ventas y en Mesa de Control.
   */
  cotizacionId: number | null;
  payload: PedidoMesaControlUpdate;
};

interface UseUpdatePedidoMesaControlOptions {
  onValidationError?: (issues: QuoteValidationIssue[]) => void;
}

/**
 * Mutación de edición de pedido por Mesa de Control.
 *
 * Reusa `extractQuoteValidationIssues` de cotizaciones —no una copia— porque el
 * 400 de este endpoint tiene la MISMA forma: DRF anida los errores bajo las
 * claves del documento (`pedido.*`, `detalle.N.*`), y ese normalizador ya
 * traduce ambos prefijos al espacio de nombres del formulario, que aquí es
 * literalmente el mismo (`QuoteFormContent`).
 */
export const useUpdatePedidoMesaControl = (
  { onValidationError }: UseUpdatePedidoMesaControlOptions = {},
) => {
  const queryClient = useQueryClient();

  return useMutation<
    PedidoMesaControlUpdateResponse,
    unknown,
    UpdatePedidoMesaControlVariables
  >({
    mutationFn: ({ pedidoId, payload }) => updatePedidoMesaControl(pedidoId, payload),
    onSuccess: (_, { pedidoId, cotizacionId }) => {
      queryClient.invalidateQueries({ queryKey: ["pedido-detail", pedidoId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      // La cotización de origen también cambió en el servidor.
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      if (cotizacionId) {
        queryClient.invalidateQueries({ queryKey: ["quote", cotizacionId] });
      }
      toast.success("Pedido actualizado y sincronizado con su cotización");
    },
    onError: (error) => {
      let message: string | undefined;
      if (error instanceof AxiosError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;
        if (statusCode === 400 && data) {
          const issues = extractQuoteValidationIssues(data);
          if (issues.length > 0) {
            onValidationError?.(issues);
          }
          message = extractRejectionMessage(data);
        }
      }
      /* `extractErrorMessage` como último eslabón: lee el `{ error: string }`
       * de Django. No sirve como PRIMERO porque un `AxiosError` es un `Error`,
       * así que devolvería "Request failed with status code 400" antes de mirar
       * las claves de DRF. */
      toast.error(message ?? extractErrorMessage(error, "No se pudo actualizar el pedido"));
    },
  });
};
