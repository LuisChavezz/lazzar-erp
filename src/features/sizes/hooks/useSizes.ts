import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getSizes } from "../services/actions";
import { Size } from "../interfaces/size.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useSizes = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<Size[]>(
    {
      queryKey: ["sizes"],
      queryFn: getSizes,
    },
    { toastId: "sizes-refetch-error" },
  );

  const sizes = data ?? [];

  return {
    sizes,
    isLoading,
    isInitialError,
    error,
  };
};
