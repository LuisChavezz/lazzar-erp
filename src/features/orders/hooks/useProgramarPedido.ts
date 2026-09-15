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
import { programarPedido } from "../services/actions";
import type {
  PedidoProgramarPayload,
  PedidoProgramarResponse,
} from "../interfaces/pedido-programacion.interface";

/**
 * Claves de RECHAZO: motivos que no corresponden a ningún campo del formulario
 * y por eso van al toast. Mismo criterio que `useUpdatePedidoMesaControl`:
 *
 * - `permiso`: `_require_mesa_control` — HTTP 400 con el mensaje plano bajo la
 *   clave, no un 403.
 * - `detail`: `APIException` genéricos de DRF.
 */
const REJECTION_KEYS = ["permiso", "detail"] as const;

const extractRejectionMessage = (data: unknown): string | undefined => {
  if (!data || typeof data !== "object") return undefined;
  const body = data as Record<string, unknown>;
  for (const key of REJECTION_KEYS) {
    const message = firstDrfMessage(body[key]);
    if (message) return message;
  }
  return undefined;
};

/**
 * Errores de campo del 400. Reusa `extractQuoteValidationIssues` (el mismo
 * normalizador que la edición de Mesa de Control): DRF anida los errores por
 * ruta y aquí las rutas ya coinciden con las del formulario —
 * `programaciones` (suma excedida) y `programaciones.N.destino` /
 * `programaciones.N.cantidad` (por renglón)—.
 */
const extractProgramacionIssues = (data: unknown): QuoteValidationIssue[] => {
  const issues = extractQuoteValidationIssues(data).filter(
    (issue) => issue.path === "programaciones" || issue.path.startsWith("programaciones."),
  );
  /* `extractQuoteValidationIssues` solo reconoce mensajes dentro de un ARRAY.
   * El serializer envuelve el de la suma en lista, pero si llegara como string
   * plano se perdería sin este respaldo. */
  const flat = (data as Record<string, unknown> | null)?.programaciones;
  if (typeof flat === "string" && flat.length > 0) {
    issues.push({ path: "programaciones", message: flat });
  }
  return issues;
};

type ProgramarPedidoVariables = {
  pedidoId: number;
  payload: PedidoProgramarPayload;
};

interface UseProgramarPedidoOptions {
  onValidationError?: (issues: QuoteValidationIssue[]) => void;
}

/**
 * Mutación de "Programar pedido". Espeja el manejo de `useUpdatePedidoMesaControl`
 * SIN el 409, que este endpoint no tiene (no reescribe renglones).
 */
export const useProgramarPedido = ({ onValidationError }: UseProgramarPedidoOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation<PedidoProgramarResponse, unknown, ProgramarPedidoVariables>({
    mutationFn: ({ pedidoId, payload }) => programarPedido(pedidoId, payload),
    onSuccess: (_, { pedidoId }) => {
      queryClient.invalidateQueries({ queryKey: ["pedido-detail", pedidoId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Programación del pedido guardada");
    },
    onError: (error) => {
      let message: string | undefined;
      let hasFieldIssues = false;
      if (error instanceof AxiosError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;
        if (statusCode === 400 && data) {
          const issues = extractProgramacionIssues(data);
          if (issues.length > 0) {
            hasFieldIssues = true;
            onValidationError?.(issues);
          }
          message = extractRejectionMessage(data);
        }
        // `get_object` acota por empresa: un pedido ajeno responde 404.
        if (statusCode === 404) {
          message = "El pedido no existe o no pertenece a tu empresa.";
        }
      }
      /* Con errores de campo y sin rechazo, el detalle ya está marcado en el
       * formulario: el toast solo lo anuncia. Sin este caso caería a
       * `extractErrorMessage`, que devolvería "Request failed with status code
       * 400". */
      toast.error(
        message ??
          (hasFieldIssues
            ? "Revisa la programación: hay errores marcados."
            : extractErrorMessage(error, "No se pudo guardar la programación")),
      );
    },
  });
};
