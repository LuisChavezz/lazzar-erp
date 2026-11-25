import { useMutation, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { cancelErrorMeansStaleCache, type CancelError } from "../utils/cancelErrors";

/**
 * Una cancelación con motivo (o la reversa de una TR): lo único que cambia entre
 * documentos. La arma cada uno (`pickingCancelAction`,
 * `embroideryOrderCancelAction`…) y la recibe `CancelReasonDialog`. WMS la
 * arma desde su propia forma (`WmsCancelAction`, `toCancelAction`).
 */
export interface CancelAction<TResult> {
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
   * Lo que se relee al terminar bien y cuando el error dice que la caché está
   * vieja (`cancelErrorMeansStaleCache`): el documento y lo que depende de él.
   * Se dispara sin esperarse, para que el diálogo cierre en cuanto termina la
   * escritura en caché.
   */
  refresh: (queryClient: QueryClient) => void;
  /** Qué significa cada error (`classifyCancelError` con las llaves de la acción). */
  classifyError: (error: unknown) => CancelError;
  successMessage: (result: TResult) => string;
}

interface UseCancelMutationOptions {
  /** Error de `motivo`: se pinta bajo el campo en vez de en un toast. */
  onMotivoError?: (message: string) => void;
  /**
   * `400` de negocio (`blocked`, `retryable`): se pinta en el diálogo en vez de
   * en un toast. Sin él, toast (lo de siempre en WMS).
   */
  onBlockedError?: (message: string) => void;
}

/**
 * Mutación de una `CancelAction`. Al tener éxito escribe el resultado en caché,
 * relee (`refresh`) y avisa. Errores (`classifyError`): `motivo` bajo el campo;
 * el resto, toast con el mensaje del backend tal cual (o en el diálogo, con
 * `onBlockedError`). Si el documento ya no se puede cancelar o cambió en otro
 * lado se relee todo para que la acción deje de ofrecerse; el diálogo decide si
 * se cierra.
 */
export const useCancelMutation = <TResult>(
  action: CancelAction<TResult>,
  { onMotivoError, onBlockedError }: UseCancelMutationOptions = {},
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
      action.refresh(queryClient);
      toast.success(action.successMessage(result));
    },
    onError: (error) => {
      const classified = action.classifyError(error);
      if (classified.kind === "motivo" && onMotivoError) {
        onMotivoError(classified.message);
        return;
      }
      if ((classified.kind === "blocked" || classified.kind === "retryable") && onBlockedError) {
        onBlockedError(classified.message);
      } else {
        toast.error(classified.message);
      }
      // Ya no se puede (o cambió en otro lado): la caché está vieja, se relee.
      if (cancelErrorMeansStaleCache(classified)) action.refresh(queryClient);
    },
  });
};
