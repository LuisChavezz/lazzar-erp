import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getSalidaMaquila } from "../services/actions";

/** Detalle de una SM (con renglones). 404 = fuera de alcance o no existe. */
export const useSalidaMaquila = (id: number | null) =>
  useGuardedQuery(
    {
      queryKey: ["salidas-maquila", "detail", id],
      queryFn: () => getSalidaMaquila(id as number),
      enabled: id !== null,
    },
    { toastId: "salida-maquila-detail-refetch-error", isDefinitiveError: isNotFoundError },
  );
