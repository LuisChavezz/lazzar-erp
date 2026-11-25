"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { DOCUMENT_AUDIT_QUERY_KEY } from "@/src/features/document-audit/hooks/useDocumentAuditList";
import { embroideryOnboardingQueryKey } from "@/src/features/embroidery/hooks/useEmbroideryOnboarding";
import { reflectiveOnboardingQueryKey } from "@/src/features/reflective-orders/hooks/useReflectiveOnboarding";
import { corteMangaOnboardingQueryKey } from "@/src/features/corte-manga/hooks/useCorteMangaOnboarding";
import { liberarPedido, retenerPedido } from "../services/actions";
import { ORDERS_QUERY_KEY } from "../constants/ordersQueryKeys";
import { pedidoDetailQueryKey } from "./usePedidoDetail";
import type { PedidoRetencionResponse } from "../interfaces/pedido-retencion.interface";
import {
  isStalePedidoRetencionError,
  pedidoRetencionErrorMessage,
} from "../utils/pedidoRetencion";
import { applyPedidoRetencionResult } from "../utils/pedidoRetencionCache";

/**
 * Candado de la retención, ÚNICO por pedido y compartido por `retener/` y
 * `liberar/`: mientras una está en vuelo no sale la otra, ni desde el detalle
 * ni desde el listado de Mesa de Control.
 */
export const pedidoRetencionMutationKey = (pedidoId: number) =>
  ["retencion-pedido", pedidoId] as const;

/**
 * Consultas que cambian al retener o liberar, además del listado y el detalle:
 * la bitácora y la línea de tiempo (un renglón "Activo ↔ Retenido") y los
 * onboardings, que dejan de ofrecer un pedido retenido (o vuelven a ofrecerlo).
 * Picking, packing y despacho por raíz (sus llaves llevan pedido, picking o
 * packing). `special-orders` (selector de OP) no filtra retenidos en el
 * backend; se relee para que el alta no parta de una lista vieja.
 */
const RETENCION_RELATED_QUERY_KEYS: readonly QueryKey[] = [
  DOCUMENT_AUDIT_QUERY_KEY,
  ["picking-onboarding"],
  ["packing-onboarding"],
  ["shipping-onboarding"],
  embroideryOnboardingQueryKey,
  reflectiveOnboardingQueryKey,
  corteMangaOnboardingQueryKey,
  ["special-orders"],
];

/** Relee lo que muestra o depende de la retención del pedido. Sin esperar. */
const invalidateAfterRetencion = (queryClient: QueryClient, pedidoId: number) => {
  void queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: pedidoDetailQueryKey(pedidoId), exact: true });
  for (const queryKey of RETENCION_RELATED_QUERY_KEYS) {
    void queryClient.invalidateQueries({ queryKey });
  }
};

type RetencionAction = "retener" | "liberar";

interface RetencionVariables {
  /** Folio que mostró quien llama, para el toast si la respuesta no lo trae. */
  folio: string | null;
  /** Solo `retener`. */
  motivo?: string;
  /** Quien llama pinta el error de `motivo` bajo su campo; sin él va a toast. */
  onMotivoError?: (message: string) => void;
}

export interface RetencionCallbacks {
  /** Tras aplicarse, con la caché ya escrita (las relecturas siguen en curso). */
  onSuccess?: () => void;
  /** Cualquier fallo que no sea el de `motivo` pintado bajo su campo, tras su toast. */
  onError?: (error: unknown) => void;
  onMotivoError?: (message: string) => void;
}

const SUCCESS_VERB: Record<RetencionAction, string> = {
  retener: "retenido",
  liberar: "liberado",
};

/**
 * `retener/` o `liberar/` de UN pedido. Sin optimismo: la fila cambia cuando el
 * backend confirma, y entonces se escribe su respuesta en la caché y se releen
 * listados, detalle, bitácora y onboardings (`invalidateAfterRetencion`).
 *
 * A diferencia de `useCancelPedido`, el pedido SIGUE existiendo: nada sale de
 * la caché. Errores en toast: el 400 de `permiso` con su texto fijo, el 400
 * `pedido` y el 404 con el texto del backend o el de "ya no disponible" (y se
 * releen listado y detalle, que estaban desactualizados), el 400 `motivo` bajo
 * su campo si quien llama lo pinta (`onMotivoError`).
 */
const usePedidoRetencionMutation = (pedidoId: number, action: RetencionAction) => {
  const queryClient = useQueryClient();
  const mutationKey = pedidoRetencionMutationKey(pedidoId);
  const { isRunning, isIdle } = useMutationLock(mutationKey);

  const mutation = useMutation<PedidoRetencionResponse, unknown, RetencionVariables>({
    mutationKey,
    mutationFn: ({ motivo }) =>
      action === "retener" ? retenerPedido(pedidoId, { motivo: motivo ?? "" }) : liberarPedido(pedidoId),
    onSuccess: async (response, { folio }) => {
      try {
        await applyPedidoRetencionResult(queryClient, pedidoId, response);
      } finally {
        const label = response?.folio || folio || `#${pedidoId}`;
        toast.success(`Pedido ${label} ${SUCCESS_VERB[action]}`);
        invalidateAfterRetencion(queryClient, pedidoId);
      }
    },
    onError: (error, { onMotivoError }) => {
      const motivoMessage = onMotivoError ? drfFieldMessage(error, "motivo") : undefined;
      if (onMotivoError && motivoMessage) {
        onMotivoError(motivoMessage);
        return;
      }
      toast.error(pedidoRetencionErrorMessage(error, action));
      if (isStalePedidoRetencionError(error)) {
        void queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: pedidoDetailQueryKey(pedidoId), exact: true });
      }
    },
  });

  /** Dispara la acción salvo que ya haya una de retención en vuelo para ESTE pedido. */
  const run = (variables: RetencionVariables, { onSuccess, onError }: RetencionCallbacks) => {
    if (!isIdle()) return;
    mutation.mutate(variables, {
      onSuccess: () => onSuccess?.(),
      onError: (error) => {
        if (variables.onMotivoError && drfFieldMessage(error, "motivo")) return;
        onError?.(error);
      },
    });
  };

  return { run, isPending: isRunning };
};

/**
 * Retener un pedido (`POST .../retener/`, motivo obligatorio y ya validado).
 * Lo congela sin cancelarlo: deja de salir en los onboardings y las altas
 * sobre él responden 400 hasta liberarlo.
 */
export const useRetenerPedido = (pedidoId: number) => {
  const { run, isPending } = usePedidoRetencionMutation(pedidoId, "retener");
  const retener = (folio: string | null, motivo: string, callbacks: RetencionCallbacks = {}) =>
    run({ folio, motivo, onMotivoError: callbacks.onMotivoError }, callbacks);
  return { retener, isRetaining: isPending };
};

/** Liberar un pedido retenido (`POST .../liberar/`, sin cuerpo). */
export const useLiberarPedido = (pedidoId: number) => {
  const { run, isPending } = usePedidoRetencionMutation(pedidoId, "liberar");
  const liberar = (folio: string | null, callbacks: Omit<RetencionCallbacks, "onMotivoError"> = {}) =>
    run({ folio }, callbacks);
  return { liberar, isReleasing: isPending };
};
