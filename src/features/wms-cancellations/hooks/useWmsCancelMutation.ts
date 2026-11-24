import { useMutation, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import toast from "react-hot-toast";
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
  successMessage: (result: TResult) => string;
  /** Toast de un fallo sin mensaje del backend (red, 5xx). */
  fallbackErrorMessage: string;
}

interface UseWmsCancelMutationOptions {
  /** Error de `motivo`: se pinta bajo el campo en vez de en un toast. */
  onMotivoError?: (message: string) => void;
}

/**
 * Mutación de una `WmsCancelAction`. Al tener éxito escribe el resultado en
 * caché, invalida todo lo que toca una cancelación
 * (`invalidateAfterWmsCancellation`) y avisa. Errores (`classifyWmsCancelError`):
 * `motivo` bajo el campo; el resto, toast con el mensaje del backend tal cual.
 * Si el documento ya no se puede cancelar (`blocked`, `not-found`) se relee todo
 * para que la acción deje de ofrecerse; el diálogo decide cerrarse.
 */
export const useWmsCancelMutation = <TResult>(
  action: WmsCancelAction<TResult>,
  { onMotivoError }: UseWmsCancelMutationOptions = {},
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: action.mutationKey,
    mutationFn: action.run,
    onSuccess: async (result) => {
      try {
        await action.applyResult(queryClient, result);
      } catch (error) {
        console.error("No se pudo escribir el resultado de la cancelación en la caché", error);
      }
      void invalidateAfterWmsCancellation(queryClient);
      toast.success(action.successMessage(result));
    },
    onError: (error) => {
      const classified = classifyWmsCancelError(error, action.fallbackErrorMessage);
      if (classified.kind === "motivo" && onMotivoError) {
        onMotivoError(classified.message);
        return;
      }
      toast.error(classified.message);
      if (classified.kind === "blocked" || classified.kind === "not-found") {
        void invalidateAfterWmsCancellation(queryClient);
      }
    },
  });
};
