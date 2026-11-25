import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { useCancelMutation, type CancelAction } from "@/src/features/document-cancellation/hooks/useCancelMutation";
import { invalidateAfterWmsCancellation } from "../utils/invalidateAfterWmsCancellation";
import { classifyWmsCancelError } from "../utils/wmsCancelErrors";

/**
 * Una acción de cancelación de WMS (cancelar despacho, packing o surtido, o
 * revertir una TR, EC-945): lo único que cambia entre las cuatro. La arma cada
 * documento (`shipmentCancelAction`, `packingCancelAction`…) y la recibe el
 * diálogo compartido `WmsCancelDialog`.
 */
export interface WmsCancelAction<TResult> {
  /** Candado por documento (`["cancelar-despacho", id]`): frena el doble envío. */
  mutationKey: QueryKey;
  /** El `POST` con el motivo ya validado. */
  run: (motivo: string) => Promise<TResult>;
  /**
   * Escribe en caché el estado que respondió el backend ANTES de invalidar
   * (EC-927), para que un refetch fallido no deje el documento ofreciendo la
   * acción otra vez. Best-effort: los helpers de `cachedRows` no lanzan.
   */
  applyResult: (queryClient: QueryClient, result: TResult) => Promise<unknown> | void;
  /**
   * Opcional: lo que esta acción invalida ADEMÁS de
   * `invalidateAfterWmsCancellation` (p. ej. la reversa de calidad, EC-947:
   * bandeja de calidad, recepciones y OC/OP). Se dispara sin esperarse, igual
   * que esa, para que el diálogo cierre en cuanto termina la escritura en caché.
   */
  refresh?: (queryClient: QueryClient) => void;
  /**
   * Opcional: llaves de `400` de negocio de esta acción que, como las de WMS,
   * dicen que ya no procede (`classifyWmsCancelError`, `extraBlockingKeys`):
   * toast con el mensaje tal cual, se cierra el diálogo y se relee todo.
   */
  blockingKeys?: readonly string[];
  successMessage: (result: TResult) => string;
  /** Toast de un fallo sin mensaje del backend (red, 5xx). */
  fallbackErrorMessage: string;
}

/**
 * La `WmsCancelAction` como la acción genérica de `document-cancellation`
 * (EC-948): relee `invalidateAfterWmsCancellation` y luego su `refresh`, y
 * clasifica con las llaves y los textos de WMS. Es lo único que WMS añade a la
 * cancelación genérica; el comportamiento es el de siempre.
 */
export const toCancelAction = <TResult>(action: WmsCancelAction<TResult>): CancelAction<TResult> => ({
  mutationKey: action.mutationKey,
  run: action.run,
  applyResult: action.applyResult,
  refresh: (queryClient) => {
    void invalidateAfterWmsCancellation(queryClient);
    action.refresh?.(queryClient);
  },
  classifyError: (error) => classifyWmsCancelError(error, action.fallbackErrorMessage, action.blockingKeys),
  successMessage: action.successMessage,
});

interface UseWmsCancelMutationOptions {
  /** Error de `motivo`: se pinta bajo el campo en vez de en un toast. */
  onMotivoError?: (message: string) => void;
}

/**
 * Mutación de una `WmsCancelAction` (`useCancelMutation` sobre
 * `toCancelAction`). Al tener éxito escribe el resultado en caché, invalida
 * todo lo que toca una cancelación (`invalidateAfterWmsCancellation`) y avisa.
 * Errores (`classifyWmsCancelError`): `motivo` bajo el campo; el resto, toast
 * con el mensaje del backend tal cual. Si el documento ya no se puede cancelar
 * (`blocked`, `not-found`) se relee todo para que la acción deje de ofrecerse;
 * el diálogo decide cerrarse.
 */
export const useWmsCancelMutation = <TResult>(
  action: WmsCancelAction<TResult>,
  { onMotivoError }: UseWmsCancelMutationOptions = {},
) => useCancelMutation(toCancelAction(action), { onMotivoError });
