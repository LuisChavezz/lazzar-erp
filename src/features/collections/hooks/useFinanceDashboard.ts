import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getFinanceDashboard } from "../services/actions";
import type {
  FinanceDashboard,
  FinanceDashboardParams,
} from "../interfaces/collection.interface";

/**
 * Indicadores de finanzas de UNA moneda (`GET /finanzas/dashboard/?moneda_id=`).
 *
 * Una consulta por moneda, nunca una sin `moneda_id`: sin ella el backend suma
 * importes de monedas distintas. Varias tarjetas pueden leer la misma moneda —
 * comparten llave, así que es una sola petición— y el mismo `toastId`, así que
 * un refetch fallido da un solo toast.
 *
 * Devuelve el `data` crudo: el consumidor distingue "aún no cargó" de "cargó".
 */
export const useFinanceDashboard = (params: FinanceDashboardParams) => {
  const { data, isLoading, isInitialError } = useGuardedQuery<FinanceDashboard>(
    {
      queryKey: ["finance-dashboard", params],
      queryFn: () => getFinanceDashboard(params),
    },
    { toastId: "finance-dashboard-refetch-error" },
  );

  return { dashboard: data, isLoading, isInitialError };
};
