import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getMaquileros } from "../services/actions";

/** Proveedores maquileros (`?es_maquilero=true`). Llave `["maquileros"]`. */
export const useMaquileros = () => {
  const { data, isLoading, isInitialError } = useGuardedQuery(
    { queryKey: ["maquileros"], queryFn: getMaquileros },
    { toastId: "maquileros-refetch-error" },
  );
  return { maquileros: data ?? [], isLoading, isInitialError };
};
