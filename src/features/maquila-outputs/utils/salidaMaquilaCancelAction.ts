import type { QueryClient } from "@tanstack/react-query";
import type { CancelDialogContent } from "@/src/features/document-cancellation/components/CancelReasonDialog";
import type { CancelAction } from "@/src/features/document-cancellation/hooks/useCancelMutation";
import { classifyCancelError } from "@/src/features/document-cancellation/utils/cancelErrors";
import { embroideryOrderDetailQueryKey } from "@/src/features/embroidery/hooks/useEmbroideryOrderDetail";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";
import { productionOrderOnboardingKey } from "@/src/features/production-orders/hooks/useProductionOrderOnboarding";
import { reflectiveOrderDetailQueryKey } from "@/src/features/reflective-orders/hooks/useReflectiveOrderDetail";
import { mergeCachedRecord, patchCachedRowById, pickPresentFields } from "@/src/utils/cachedRows";
import { salidaMaquilaFolio, salidaMaquilaOrigenRef } from "../constants/salidaMaquilaOrigen";
import { cancelarSalidaMaquila } from "../services/actions";
import type { SalidaMaquila, SalidaMaquilaListItem } from "../interfaces/salida-maquila.interface";
import { SALIDA_MAQUILA_FORBIDDEN_TEXT } from "./salidaMaquilaErrors";

/** Prefijo de los listados y del detalle de SM (`["salidas-maquila", …]`). */
const SALIDAS_MAQUILA_KEY = ["salidas-maquila"] as const;

export const salidaMaquilaDetailQueryKey = (id: number) => [...SALIDAS_MAQUILA_KEY, "detail", id] as const;

/** Candado por salida. */
export const cancelSalidaMaquilaMutationKey = (id: number) => ["salida-maquila-cancelar", id] as const;

/**
 * `400` con que `cancelar/` dice que ya no procede: `{"estatus": [...]}` (no está
 * Enviada, o ya tiene recepciones). Va tal cual, en el diálogo, y se relee.
 */
export const SALIDA_MAQUILA_CANCEL_BLOCKING_KEYS = ["estatus"] as const;

/** Lo que una cancelación cambia de la SM: su estatus y quién, cuándo y por qué. */
const STATUS_FIELDS = [
  "estatus",
  "estatus_display",
  "motivo_cancelacion",
  "fecha_cancelacion",
  "cancelado_por",
  "cancelado_por_nombre",
] as const satisfies readonly (keyof SalidaMaquilaListItem)[];

/**
 * Lo que se relee tras cancelar una SM: todas las SM (las secciones de cada
 * orden filtran por origen), el detalle de su orden de origen (OP, OB u OR:
 * sus piezas en SM vuelven a estar disponibles) y el pedido 360° (Documentos).
 */
const refreshAfterSalidaCancel = (queryClient: QueryClient, salida: SalidaMaquilaListItem) => {
  void queryClient.invalidateQueries({ queryKey: SALIDAS_MAQUILA_KEY });
  const origen = salidaMaquilaOrigenRef(salida);
  if (origen?.origen === "OP") {
    void queryClient.invalidateQueries({ queryKey: productionOrderOnboardingKey(origen.id) });
    void queryClient.invalidateQueries({ queryKey: ["production-orders", "retrieve", origen.id] });
  } else if (origen?.origen === "OB") {
    void queryClient.invalidateQueries({ queryKey: embroideryOrderDetailQueryKey(origen.id) });
  } else if (origen?.origen === "OR") {
    void queryClient.invalidateQueries({ queryKey: reflectiveOrderDetailQueryKey(origen.id) });
  }
  void invalidatePedidoProgress(queryClient);
};

/**
 * Cancelar una SM Enviada sin recepciones (`POST salidas-maquila/{id}/cancelar/`
 * con `{"motivo"}`, nucleo-erp#1355). La respuesta es el detalle completo; de
 * él solo se escriben el estatus y los datos de cancelación, en la fila de cada
 * listado y en el detalle en caché (EC-927), y luego se relee.
 */
export const salidaMaquilaCancelAction = (salida: SalidaMaquilaListItem): CancelAction<SalidaMaquila> => ({
  mutationKey: cancelSalidaMaquilaMutationKey(salida.id),
  run: (motivo) => cancelarSalidaMaquila(salida.id, motivo),
  applyResult: async (queryClient, result) => {
    const values = pickPresentFields<SalidaMaquilaListItem>(result, STATUS_FIELDS);
    if (values.estatus === undefined || result?.id !== salida.id) return;
    await patchCachedRowById<SalidaMaquilaListItem>(queryClient, SALIDAS_MAQUILA_KEY, salida.id, (row) => ({
      ...row,
      ...values,
    }));
    await mergeCachedRecord(queryClient, salidaMaquilaDetailQueryKey(salida.id), salida.id, values);
  },
  refresh: (queryClient) => refreshAfterSalidaCancel(queryClient, salida),
  classifyError: (error) =>
    classifyCancelError(error, {
      blockingKeys: SALIDA_MAQUILA_CANCEL_BLOCKING_KEYS,
      messages: {
        fallback: "No se pudo cancelar la salida.",
        notFound: "La salida ya no está disponible o no tienes acceso a ella.",
        forbidden: SALIDA_MAQUILA_FORBIDDEN_TEXT,
      },
    }),
  successMessage: (result) => `${salidaMaquilaFolio(result?.folio ? result : salida)} cancelada.`,
});

/** Texto del diálogo de "Cancelar salida". */
export const salidaMaquilaCancelDialogContent = (
  salida: SalidaMaquilaListItem,
): CancelDialogContent<SalidaMaquila> => ({
  action: salidaMaquilaCancelAction(salida),
  title: `Cancelar ${salidaMaquilaFolio(salida)}`,
  description:
    "Las piezas vuelven a quedar disponibles para otra salida de la misma orden. No se puede deshacer.",
  submitLabel: "Cancelar salida",
  pendingLabel: "Cancelando…",
  motivoPlaceholder: "Explica por qué se cancela la salida",
  keepOpenOnBlocked: true,
});
