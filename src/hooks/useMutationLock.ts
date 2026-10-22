import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";

/**
 * Candado contra el doble envío de una acción irreversible: la mutación misma,
 * con `mutationKey` POR REGISTRO. `isRunning` es para pintar (llega un render
 * tarde); `isIdle()` consulta la caché de mutaciones de forma SÍNCRONA, así que
 * sobrevive a un remontaje y es el mismo para todos los diálogos de ese registro.
 */
export const useMutationLock = (mutationKey: QueryKey) => {
  const queryClient = useQueryClient();
  const isRunning = useIsMutating({ mutationKey, exact: true }) > 0;
  const isIdle = () => queryClient.isMutating({ mutationKey, exact: true }) === 0;
  return { isRunning, isIdle };
};

/**
 * Fallo ANTES de la acción: la lectura fresca previa no respondió. Su `message`
 * ya es el texto para el usuario y va tal cual al toast.
 */
export class PrecheckError extends Error {}

/**
 * `PrecheckError` a partir del fallo de la lectura previa. El motivo sale del
 * cuerpo DRF (`detail` de un 404/403, o el primer campo con mensaje) antes que
 * del `error.message` de Axios ("Request failed with status code 404").
 */
export const toPrecheckError = (error: unknown, fallback: string): PrecheckError =>
  new PrecheckError(firstDrfFieldMessage(error) ?? extractErrorMessage(error, fallback));

/**
 * Retrieve FRESCO de un registro antes de una acción irreversible. Llama al
 * `fetcher` directamente, sin `fetchQuery`: `fetchQuery` reutiliza una
 * petición que ya esté en vuelo para esa llave, y esa pudo salir ANTES de que
 * otra pestaña cambiara el registro, así que el precheck decidiría con datos
 * viejos. El resultado se escribe en la caché de `queryKey`, así que la vista
 * también queda al día. Si falla, lanza `PrecheckError` con el motivo listo
 * para el toast.
 */
export const fetchFresh = async <T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  fetcher: () => Promise<T>,
  fallback: string,
): Promise<T> => {
  let data: T;
  try {
    data = await fetcher();
  } catch (error) {
    throw toPrecheckError(error, fallback);
  }
  queryClient.setQueryData(queryKey, data);
  return data;
};
