import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { CancelAction } from "@/src/features/document-cancellation/hooks/useCancelMutation";
import { classifyCancelError, type CancelError } from "@/src/features/document-cancellation/utils/cancelErrors";
import { PrecheckError } from "@/src/hooks/useMutationLock";
import { isActionOutcomeUnknown } from "@/src/utils/actionOutcome";
import { patchCachedRowById, pickPresentFields, resultRecordId } from "@/src/utils/cachedRows";

/**
 * Lo único que una cancelación escribe en la fila (EC-927): el estatus y quién,
 * cuándo y por qué. Nunca importes ni el resto de la respuesta.
 */
export const FINANCE_CANCELLED_FIELDS = [
  "estatus",
  "motivo_cancelacion",
  "fecha_cancelacion",
  "cancelado_por",
  "cancelado_por_nombre",
] as const;

/** Los campos de `FINANCE_CANCELLED_FIELDS` que trae la respuesta de `cancelar/`. */
export const financeCancelledValues = (result: unknown): Record<string, unknown> =>
  pickPresentFields<Record<(typeof FINANCE_CANCELLED_FIELDS)[number], unknown>>(result, FINANCE_CANCELLED_FIELDS);

/**
 * Escribe esos campos en la fila del documento en CADA variante del listado en
 * caché bajo `listQueryKey` (`patchCachedRowById`). Best-effort: una respuesta
 * sin `id` o sin esos campos no escribe nada.
 */
export const writeCancelledRow = async (queryClient: QueryClient, listQueryKey: QueryKey, result: unknown) => {
  const values = financeCancelledValues(result);
  if (Object.keys(values).length === 0) return;
  await patchCachedRowById<object>(queryClient, listQueryKey, resultRecordId(result), (row) => ({ ...row, ...values }));
};

/** Llave del `400` de un documento que ya está cancelado (`exigir_no_cancelado`). */
const ALREADY_CANCELLED_KEY = "estatus";

/**
 * Lo que distingue la cancelación con motivo de un documento de Finanzas
 * (nucleo-erp#1356, EC-950). El resto (cómo se clasifican los errores) es
 * común.
 */
export interface FinanceCancelConfig<TResult> {
  /** Candado por documento: frena el doble envío. */
  mutationKey: QueryKey;
  /**
   * La petición con el motivo ya validado. Puede lanzar `PrecheckError` (una
   * lectura previa dijo que ya no procede): se trata como un `400` de negocio.
   */
  run: (motivo: string) => Promise<TResult>;
  /** Escribe en caché lo que respondió el backend antes de releer (EC-927). */
  applyResult?: (queryClient: QueryClient, result: TResult) => Promise<unknown> | void;
  /** Lo que se relee al terminar bien y cuando la caché quedó vieja. */
  refresh: (queryClient: QueryClient) => void;
  /**
   * Llaves del `400` con que el backend dice que ya no se puede cancelar, además
   * de `estatus` (ya cancelado): `rep` en un cobro, `movimiento_bancario`…
   */
  blockingKeys?: readonly string[];
  /** "la póliza", "el cobro": para los mensajes sin texto del backend. */
  documentLabel: string;
  /** Aviso propio de un corte sin respuesta; por omisión `financeCancelUnconfirmedMessage`. */
  unconfirmedMessage?: string;
  successMessage: (result: TResult) => string;
}

/** Primera letra en mayúscula ("La póliza…"). */
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Aviso cuando la petición se cortó sin respuesta del backend
 * (`isActionOutcomeUnknown`): la cancelación pudo aplicarse. Repetirla sobre un
 * documento ya cancelado responde `400 estatus`, así que reintentar es seguro.
 */
export const financeCancelUnconfirmedMessage = (documentLabel: string): string =>
  `No se recibió respuesta del servidor: ${documentLabel} pudo haberse cancelado. Revisa los datos actualizados antes de volver a intentarlo.`;

/**
 * Clasifica un error de una cancelación de Finanzas para `CancelReasonDialog`:
 * - `PrecheckError` → `blocked` (ya no procede; se relee).
 * - Sin respuesta del backend → `retryable`: pudo aplicarse, se relee y el
 *   diálogo queda abierto.
 * - El resto, `classifyCancelError` con `estatus` más las llaves del documento:
 *   el `400` de `motivo` bajo el campo, el `403` con su `detail` y cualquier
 *   otro mensaje del backend tal cual (incluido el cuerpo de un `409`).
 */
export const classifyFinanceCancelError = (
  error: unknown,
  {
    documentLabel,
    blockingKeys = [],
    unconfirmedMessage,
  }: Pick<FinanceCancelConfig<unknown>, "documentLabel" | "blockingKeys" | "unconfirmedMessage">,
): CancelError => {
  if (error instanceof PrecheckError) return { kind: "blocked", message: error.message };
  if (isActionOutcomeUnknown(error)) {
    return { kind: "retryable", message: unconfirmedMessage ?? financeCancelUnconfirmedMessage(documentLabel) };
  }
  return classifyCancelError(error, {
    blockingKeys: [ALREADY_CANCELLED_KEY, ...blockingKeys],
    messages: {
      fallback: `No se pudo cancelar ${documentLabel}.`,
      notFound: `${capitalize(documentLabel)} ya no existe o no tienes acceso.`,
      forbidden: `No tienes permiso para cancelar ${documentLabel}.`,
    },
  });
};

/** La `CancelAction` de un documento de Finanzas. */
export const financeCancelAction = <TResult>(config: FinanceCancelConfig<TResult>): CancelAction<TResult> => ({
  mutationKey: config.mutationKey,
  run: config.run,
  applyResult: (queryClient, result) => config.applyResult?.(queryClient, result),
  refresh: config.refresh,
  classifyError: (error) => classifyFinanceCancelError(error, config),
  successMessage: config.successMessage,
});
