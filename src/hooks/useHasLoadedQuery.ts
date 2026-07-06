import { useEffect } from "react";
import toast from "react-hot-toast";

interface UseHasLoadedQueryOptions<T> {
  data: T | undefined;
  isError: boolean;
  toastId: string;
  errorMessage?: string;
}

/**
 * Distingue una carga inicial fallida de un refetch fallido con datos en
 * caché. Si el refetch falla pero ya hay datos cargados, muestra un toast
 * no bloqueante en vez de esconder el contenido existente. `toastId` debe
 * ser único por hook consumidor para que llamadas repetidas (p. ej. el
 * mismo hook usado en varios componentes de una misma página) colapsen en
 * un solo toast en lugar de apilarse.
 */
export const useHasLoadedQuery = <T>({
  data,
  isError,
  toastId,
  errorMessage = "No se pudo actualizar la información. Mostrando datos anteriores.",
}: UseHasLoadedQueryOptions<T>) => {
  const hasLoaded = data !== undefined;

  useEffect(() => {
    if (isError && hasLoaded) {
      toast.error(errorMessage, { id: toastId });
    }
  }, [isError, hasLoaded, errorMessage, toastId]);

  return { hasLoaded };
};
