import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getCobrosResumen } from "../services/actions";
import type { CobrosResumen } from "../interfaces/collection.interface";

/**
 * Indicadores de Cobros (`GET /finanzas/cobros/resumen/`, EC-746): cobros
 * aplicados del período por moneda, en UNA consulta. Es de la propia sección
 * (se lee con `R-CONTABILIDAD-CXC`), a diferencia del dashboard de Finanzas,
 * que exige `R-CONTABILIDAD` y trae datos de otras secciones.
 *
 * Devuelve el `data` crudo: el consumidor distingue "aún no cargó" de "cargó".
 * Se invalida con los efectos de un cobro (`invalidateCobroEffects`).
 */
export const useCobrosResumen = () => {
  const { data, isLoading, isInitialError } = useGuardedQuery<CobrosResumen>(
    {
      queryKey: ["cobros-resumen"],
      queryFn: () => getCobrosResumen(),
    },
    { toastId: "cobros-resumen-refetch-error" },
  );

  return { resumen: data, isLoading, isInitialError };
};
