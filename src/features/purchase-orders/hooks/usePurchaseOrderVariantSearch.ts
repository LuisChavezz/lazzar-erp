import { keepPreviousData } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isClientError } from "@/src/utils/drfWriteErrors";
import { searchPurchaseOrderVariants } from "../services/actions";
import type { PurchaseOrderOnboardingVariante } from "../interfaces/purchase-order-onboarding.interface";

/**
 * Variantes de producto terminado que coinciden con `varianteQ` (EC-657), para
 * el selector de renglones de una OC de PT. El `varianteQ` DEBE llegar ya
 * debounced desde el consumidor: cada valor es una petición.
 *
 * - Llave propia, aparte de `["purchase-order-onboarding"]`: esta respuesta
 *   trae productos y proveedores recortados por la búsqueda y no debe pisar
 *   el catálogo completo que usan los pasos del wizard.
 * - `keepPreviousData`: al teclear se conservan los resultados anteriores
 *   mientras llegan los nuevos (`isPlaceholderData`), sin parpadeo.
 * - Un 4xx no se reintenta, como en `usePurchaseOrderOnboardingData`: es el
 *   mismo endpoint. En la práctica su único rechazo (usuario sin empresa) ya
 *   detuvo el wizard en el Step 1, antes de llegar a esta búsqueda.
 */
export const usePurchaseOrderVariantSearch = (varianteQ: string) => {
  const { data, isInitialError, isFetching, isPlaceholderData, hasLoaded, refetch } =
    useGuardedQuery<PurchaseOrderOnboardingVariante[]>(
      {
        queryKey: ["purchase-order-variant-search", varianteQ],
        queryFn: () => searchPurchaseOrderVariants(varianteQ),
        placeholderData: keepPreviousData,
        retry: (failureCount, failure) => !isClientError(failure) && failureCount < 1,
      },
      {
        toastId: "purchase-order-variant-search-refetch-error",
        errorMessage: "No se pudo actualizar la búsqueda de SKU. Mostrando los resultados anteriores.",
      },
    );

  return {
    variantes: data ?? [],
    hasLoaded,
    isInitialError,
    isFetching,
    isPlaceholderData,
    refetch,
  };
};
