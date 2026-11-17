import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getOpParaSalidaMaquila } from "../services/actions";

/** Renglones y costo de maquila de la OP, para armar la SM. Solo con el diálogo abierto. */
export const useOpParaSalidaMaquila = (opId: number, enabled: boolean) =>
  useGuardedQuery(
    {
      queryKey: ["production-orders", "retrieve", opId],
      queryFn: () => getOpParaSalidaMaquila(opId),
      enabled,
      staleTime: 0,
    },
    { toastId: "op-para-salida-maquila-refetch-error" },
  );
