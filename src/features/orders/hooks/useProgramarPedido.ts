"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { embroideryOnboardingQueryKey } from "@/src/features/embroidery/hooks/useEmbroideryOnboarding";
import { reflectiveOnboardingQueryKey } from "@/src/features/reflective-orders/hooks/useReflectiveOnboarding";
import { corteMangaOnboardingQueryKey } from "@/src/features/corte-manga/hooks/useCorteMangaOnboarding";
import { invalidateScheduledPedidos } from "@/src/features/picking/hooks/useScheduledPedidos";
import { programarPedido } from "../services/actions";
import { ORDERS_QUERY_KEY } from "../constants/ordersQueryKeys";
import { invalidatePedidoProgress } from "./invalidatePedidoProgress";
import { parseProgramarPedidoError } from "../utils/pedidoProgramarErrors";
import type { QuoteValidationIssue } from "@/src/features/quotes/utils/quoteValidationErrors";
import type {
  PedidoProgramarPayload,
  PedidoProgramarResponse,
} from "../interfaces/pedido-programacion.interface";

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
      const { issues, message, refreshOrders } = parseProgramarPedidoError(error);
      if (issues.length > 0) onValidationError?.(issues);
      // 404 (pedido cancelado) o 400 de pedido sin confirmar: la fila de la
      // lista estaba desactualizada. Se releen los listados para que deje de
      // ofrecer "Programar" (EC-781).
      if (refreshOrders) queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      toast.error(message);
    },
  });
};
