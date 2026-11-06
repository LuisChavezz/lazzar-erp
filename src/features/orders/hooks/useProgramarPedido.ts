"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import {
  extractProcessCompatibilityMessage,
  extractQuoteValidationIssues,
  type QuoteValidationIssue,
} from "@/src/features/quotes/utils/quoteValidationErrors";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstRejectionMessage } from "@/src/utils/firstDrfMessage";
import { embroideryOnboardingQueryKey } from "@/src/features/embroidery/hooks/useEmbroideryOnboarding";
import { reflectiveOnboardingQueryKey } from "@/src/features/reflective-orders/hooks/useReflectiveOnboarding";
import { corteMangaOnboardingQueryKey } from "@/src/features/corte-manga/hooks/useCorteMangaOnboarding";
import { invalidateScheduledPedidos } from "@/src/features/picking/hooks/useScheduledPedidos";
import { programarPedido } from "../services/actions";
import { ORDERS_QUERY_KEY } from "../constants/ordersQueryKeys";
import { invalidatePedidoProgress } from "./invalidatePedidoProgress";
import {
  isMesaControlPermisoError,
  PEDIDO_PROGRAMAR_PERMISO_MESSAGE,
} from "../utils/pedidoProgramarErrors";
import type {
  PedidoProgramarPayload,
  PedidoProgramarResponse,
} from "../interfaces/pedido-programacion.interface";

/**
 * Claves de RECHAZO: motivos que no corresponden a ningún campo del formulario
 * y por eso van al toast. Mismo criterio que `useUpdatePedidoMesaControl`:
 *
 * - `detail`: `APIException` genéricos de DRF.
 *
 * El 400 de `permiso` (`_require_mesa_control`, no un 403) no pasa por aquí:
 * `onError` lo traduce antes con `isMesaControlPermisoError`.
 *
 * Además `compatibilidad_proceso` (matriz prenda/proceso): una lista que se
 * muestra completa.
 */
const REJECTION_KEYS = ["detail"] as const;

const extractRejectionMessage = (data: unknown): string | undefined =>
  extractProcessCompatibilityMessage(data) ?? firstRejectionMessage(data, REJECTION_KEYS);

/**
 * Errores de campo del 400. Reusa `extractQuoteValidationIssues` (el mismo
 * normalizador que la edición de Mesa de Control): DRF anida los errores por
 * ruta y aquí las rutas ya coinciden con las del formulario —
 * `programaciones` (suma excedida) y `programaciones.N.destino` /
 * `programaciones.N.cantidad` / `programaciones.N.comentarios` (por renglón)—.
 * Acepta el mensaje como lista o como string suelto.
 */
const extractProgramacionIssues = (data: unknown): QuoteValidationIssue[] =>
  extractQuoteValidationIssues(data).filter(
    (issue) => issue.path === "programaciones" || issue.path.startsWith("programaciones."),
  );

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
    onSuccess: () => {
      // Solo reescribe `programacion_conf` (no renglones ni totales), así que no
      // usa `invalidatePedidoLinesRewritten`: ni `pedido-kpis` cambia. Detalle,
      // "Programar pedido" y el paso "Programado" de la trazabilidad, con la
      // regla común (`invalidatePedidoProgress`, por raíz), y los listados, que
      // muestran lo programado.
      void invalidatePedidoProgress(queryClient);
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      // Los onboardings de OB/OR/OCM exponen `programado` por pedido
      // (`MesaControlProgramadoIndicator`): uno ya abierto debe reflejar la
      // programación nueva sin recargar.
      queryClient.invalidateQueries({ queryKey: embroideryOnboardingQueryKey });
      queryClient.invalidateQueries({ queryKey: reflectiveOnboardingQueryKey });
      queryClient.invalidateQueries({ queryKey: corteMangaOnboardingQueryKey });
      // Pedidos de Almacén y el Paso 1 de Nuevo Surtido listan solo los
      // programados, con sus programaciones.
      void invalidateScheduledPedidos(queryClient);
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
          message = isMesaControlPermisoError(error)
            ? PEDIDO_PROGRAMAR_PERMISO_MESSAGE
            : extractRejectionMessage(data);
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
