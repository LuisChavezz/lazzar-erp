import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { CancelDialogContent } from "@/src/features/document-cancellation/components/CancelReasonDialog";
import type { CancelAction } from "@/src/features/document-cancellation/hooks/useCancelMutation";
import { classifyCancelError } from "@/src/features/document-cancellation/utils/cancelErrors";
import { DOCUMENT_AUDIT_QUERY_KEY } from "@/src/features/document-audit/hooks/useDocumentAuditList";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";
import { mergeCachedRecord, patchCachedRowById } from "@/src/utils/cachedRows";
import type { WorkOrderCancelResponse } from "../interfaces/work-order-cancellation.interface";

/** Campo de estatus de cada orden de trabajo, tal cual el backend. */
export type WorkOrderStatusField = "estatus_bordado" | "estatus_reflejante" | "estatus_corte";

/**
 * Lo que distingue la cancelación de una OB, una OR o una OCM
 * (`POST {id}/cancelar/` con motivo, nucleo-erp#1355): todo lo demás es igual.
 */
export interface WorkOrderCancelConfig {
  orderId: number;
  /** Folio de la orden, o `null` sin folio (se usa `#id`). */
  folio: string | null;
  /** "orden de bordado", "orden de reflejante", "orden de corte de manga". */
  orderLabel: string;
  statusField: WorkOrderStatusField;
  /**
   * Etiqueta local del estatus cancelado, para `<campo>_display` (el
   * `cancelar/` no la trae). Sin ella no se escribe esa llave.
   */
  cancelledLabel?: string;
  cancel: (id: number, motivo: string) => Promise<WorkOrderCancelResponse>;
  /** El detalle de ESTA orden: ahí se escribe la respuesta. */
  detailQueryKey: QueryKey;
  /**
   * Prefijo de los detalles de la sección: se relee completo, porque cancelar
   * libera las piezas en el pedido y cambia la cobertura y "Otras órdenes del
   * pedido" de las hermanas (lo mismo que relee el alta).
   */
  detailPrefixQueryKey: QueryKey;
  /** El onboarding del alta de la sección: el pedido vuelve a ofrecer lo liberado. */
  onboardingQueryKey: QueryKey;
  listQueryKey: QueryKey;
  /**
   * ¿Puede tener salidas a maquila? (OB y OR). Su `400 salidas_maquila` bloquea
   * la cancelación y al cancelar se releen las SM.
   */
  hasSalidasMaquila: boolean;
}

const SALIDAS_MAQUILA_KEY = ["salidas-maquila"] as const;

/** Folio para pantalla: el folio o `#id`. */
const folioLabel = ({ folio, orderId }: Pick<WorkOrderCancelConfig, "folio" | "orderId">) =>
  folio?.trim() || `#${orderId}`;

/**
 * Llaves del `400` con que `cancelar/` dice que ya no procede (nucleo-erp
 * `cancelar_orden_servicio`): el campo de estatus (ya cancelada, dada de baja o
 * terminada) y, en OB y OR, `salidas_maquila` (una SM Enviada, con su folio).
 */
export const workOrderCancelBlockingKeys = (
  config: Pick<WorkOrderCancelConfig, "statusField" | "hasSalidasMaquila">,
): string[] => (config.hasSalidasMaquila ? [config.statusField, "salidas_maquila"] : [config.statusField]);

/**
 * Lo que la respuesta de `cancelar/` escribe en la orden: el estatus (en su
 * propio campo, con la etiqueta local) y los datos de la cancelación. Solo lo
 * que trae; `{}` si la respuesta es de otra orden o no trae el estatus, y
 * entonces no se escribe nada (EC-927).
 */
export const workOrderCancelledValues = (
  config: Pick<WorkOrderCancelConfig, "orderId" | "statusField" | "cancelledLabel">,
  result: unknown,
): Record<string, unknown> => {
  const record = result as Partial<WorkOrderCancelResponse> | null | undefined;
  if (!record || record.id !== config.orderId || typeof record.estatus !== "number") return {};
  const values: Record<string, unknown> = { [config.statusField]: record.estatus };
  if (config.cancelledLabel) values[`${config.statusField}_display`] = config.cancelledLabel;
  for (const field of ["motivo_cancelacion", "fecha_cancelacion", "cancelado_por", "cancelado_por_nombre"] as const) {
    if (record[field] !== undefined) values[field] = record[field];
  }
  return values;
};

/**
 * Lo que se relee tras cancelar (o cuando un `400` dice que la orden cambió):
 * los detalles de la sección (la orden y sus hermanas), su listado y el
 * onboarding del alta (las piezas dejan de contar como programadas), el pedido
 * 360°, la bitácora (`→ Cancelado`) y, en OB y OR, las SM.
 */
const refreshAfterWorkOrderCancel = (queryClient: QueryClient, config: WorkOrderCancelConfig) => {
  void queryClient.invalidateQueries({ queryKey: config.detailPrefixQueryKey });
  void queryClient.invalidateQueries({ queryKey: config.onboardingQueryKey });
  void queryClient.invalidateQueries({ queryKey: config.listQueryKey });
  void queryClient.invalidateQueries({ queryKey: DOCUMENT_AUDIT_QUERY_KEY });
  if (config.hasSalidasMaquila) void queryClient.invalidateQueries({ queryKey: SALIDAS_MAQUILA_KEY });
  void invalidatePedidoProgress(queryClient);
};

/** Candado por orden. */
export const cancelWorkOrderMutationKey = (statusField: WorkOrderStatusField, orderId: number) =>
  ["cancelar-orden-trabajo", statusField, orderId] as const;

/**
 * Cancelar una OB, OR u OCM con motivo (EC-948). La respuesta solo trae el
 * estatus y los datos de cancelación: se escriben en la fila del listado y en
 * el detalle en caché antes de releer (EC-927).
 */
export const workOrderCancelAction = (config: WorkOrderCancelConfig): CancelAction<WorkOrderCancelResponse> => ({
  mutationKey: cancelWorkOrderMutationKey(config.statusField, config.orderId),
  run: (motivo) => config.cancel(config.orderId, motivo),
  applyResult: async (queryClient, result) => {
    const values = workOrderCancelledValues(config, result);
    if (Object.keys(values).length === 0) return;
    await patchCachedRowById<{ id: number }>(queryClient, config.listQueryKey, config.orderId, (row) => ({
      ...row,
      ...values,
    }));
    await mergeCachedRecord(queryClient, config.detailQueryKey, config.orderId, values);
  },
  refresh: (queryClient) => refreshAfterWorkOrderCancel(queryClient, config),
  classifyError: (error) =>
    classifyCancelError(error, {
      blockingKeys: workOrderCancelBlockingKeys(config),
      messages: {
        fallback: `No se pudo cancelar la ${config.orderLabel}.`,
        notFound: `La ${config.orderLabel} ya no existe o no tienes acceso a ella.`,
        forbidden: `No tienes permiso para cancelar la ${config.orderLabel}.`,
      },
    }),
  successMessage: (result) => `${result?.folio?.trim() || folioLabel(config)} cancelada.`,
});

/** Texto del diálogo de "Cancelar orden". Un `400` de negocio se queda en el diálogo. */
export const workOrderCancelDialogContent = (
  config: WorkOrderCancelConfig,
): CancelDialogContent<WorkOrderCancelResponse> => ({
  action: workOrderCancelAction(config),
  title: `Cancelar ${config.orderLabel}`,
  description:
    `La orden ${folioLabel(config)} quedará cancelada: ya no se edita ni registra avances, y sus piezas ` +
    "dejan de contar como programadas en el pedido. No mueve inventario y no se puede deshacer.",
  submitLabel: "Cancelar orden",
  pendingLabel: "Cancelando…",
  motivoPlaceholder: "Explica por qué se cancela la orden",
  keepOpenOnBlocked: true,
});
