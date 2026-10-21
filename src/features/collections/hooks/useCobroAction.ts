import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PrecheckError, toPrecheckError, useMutationLock } from "@/src/hooks/useMutationLock";
import { getCobro } from "../services/actions";
import type { Cobro } from "../interfaces/collection.interface";
import { isActionOutcomeUnknown } from "../utils/actionOutcome";
import { writeCobroToList } from "./cobroQueryCache";

interface CobroActionConfig<TResult extends { cobro: Cobro }> {
  /** Candado del doble envío, ÚNICO por cobro (`useMutationLock`). */
  mutationKey: QueryKey;
  cobroId: number;
  /**
   * La acción, con el cobro FRESCO del precheck (ya escrito en el listado).
   * Decide con él (lanza `PrecheckError` para detenerse con un motivo) y hace la
   * petición. Devuelve el cobro vigente, que se escribe en el listado al terminar.
   */
  run: (current: Cobro) => Promise<TResult>;
  onSuccess: (result: TResult) => void;
  /** Mensaje de un error que no es del precheck (lo que respondió el backend). */
  errorMessage: (error: unknown) => string;
  /**
   * Tras cualquier error, ya avisado por toast. `outcomeUnknown`: la petición se
   * quedó sin respuesta del backend (`isActionOutcomeUnknown`), así que pudo
   * aplicarse.
   */
  onError?: (outcomeUnknown: boolean) => void;
  /** Al terminar, con cualquier resultado. */
  onSettled?: () => void;
}

/**
 * Esqueleto común de una acción irreversible sobre UN cobro (timbrar el REP,
 * cancelar): candado por cobro, retrieve FRESCO del cobro antes de la petición
 * (su fallo se reporta como `PrecheckError`), escritura del cobro vigente en el
 * listado en caché y el disparador que respeta el candado. Cada hook conserva
 * sus reglas, su endpoint, sus mensajes y sus invalidaciones.
 */
export const useCobroAction = <TResult extends { cobro: Cobro }>({
  mutationKey,
  cobroId,
  run,
  onSuccess,
  errorMessage,
  onError,
  onSettled,
}: CobroActionConfig<TResult>) => {
  const queryClient = useQueryClient();
  const { isRunning, isIdle } = useMutationLock(mutationKey);

  const mutation = useMutation<TResult, unknown, void>({
    mutationKey,
    mutationFn: async () => {
      let current: Cobro;
      try {
        current = await getCobro(cobroId);
      } catch (error) {
        throw toPrecheckError(error, "No se pudo consultar el cobro.");
      }
      writeCobroToList(queryClient, current);
      return run(current);
    },
    onSuccess: (result) => {
      writeCobroToList(queryClient, result.cobro);
      onSuccess(result);
    },
    onError: (error) => {
      toast.error(error instanceof PrecheckError ? error.message : errorMessage(error));
      onError?.(isActionOutcomeUnknown(error));
    },
    onSettled: () => onSettled?.(),
  });

  /**
   * Dispara la acción salvo que ya haya una en vuelo para ESTE cobro (consulta
   * síncrona a la caché de mutaciones). `onSettled` corre al terminar, con
   * cualquier resultado.
   */
  const trigger = (options: { onSettled?: () => void } = {}) => {
    if (!isIdle()) return;
    mutation.mutate(undefined, { onSettled: options.onSettled });
  };

  return { trigger, isRunning };
};
