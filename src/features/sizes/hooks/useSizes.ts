import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getSizes } from "../services/actions";
import { Size } from "../interfaces/size.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useHasLoadedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useSizes = () => {
  const { data, isLoading, isError, error, errorUpdatedAt } = useQuery<Size[]>({
    queryKey: ["sizes"],
    queryFn: getSizes,
  });

  const sizes = data ?? [];

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "sizes-refetch-error",
  });

  return {
    sizes,
    isLoading,
    isInitialError,
    error: isInitialError ? error : null,
  };
};
