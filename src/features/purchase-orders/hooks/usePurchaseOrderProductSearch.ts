import { keepPreviousData } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { searchPurchaseOrderProducts } from "../services/actions";
import type { PurchaseOrderOnboardingProducto } from "../interfaces/purchase-order-onboarding.interface";

/**
 * Sin datos se devuelve SIEMPRE este mismo arreglo: el selector es
 * `"use no memo"` y memoiza a mano con `productos` como dependencia; un `[]`
 * nuevo por render invalidaría esos memos en cada render (y en cada scroll).
 */
const NO_PRODUCTS: PurchaseOrderOnboardingProducto[] = [];

/**
 * Productos que coinciden con `productoQ` (EC-703), para el selector de
 * renglones de una OC de materia prima cuando el catálogo del onboarding llegó
 * recortado (`busqueda.productos_truncado`). El `productoQ` DEBE llegar ya
 * debounced desde el consumidor: cada valor es una petición. Vacío o
 * `enabled: false`, no pide nada.
 *
 * - Llave propia, aparte de `["purchase-order-onboarding"]`: esta respuesta
 *   trae proveedores y variantes recortados y no debe pisar el catálogo que
 *   usan los pasos del wizard. Mismo motivo que `usePurchaseOrderVariantSearch`.
 * - `keepPreviousData`: al teclear se conservan los resultados anteriores
 *   mientras llegan los nuevos (`isPlaceholderData`), sin parpadeo.
 * - Un 4xx no se reintenta, como en `usePurchaseOrderOnboardingData`: es el
 *   mismo endpoint. En la práctica su único rechazo (usuario sin empresa) ya
 *   detuvo el wizard en el Step 1, antes de llegar a esta búsqueda.
 */
export const usePurchaseOrderProductSearch = (productoQ: string, { enabled }: { enabled: boolean }) => {
  const { data, isInitialError, error, isFetching, isPlaceholderData, hasLoaded, refetch } = useGuardedQuery(
    {
      queryKey: ["purchase-order-product-search", productoQ],
      queryFn: () => searchPurchaseOrderProducts(productoQ),
      enabled: enabled && productoQ !== "",
      placeholderData: keepPreviousData,
      retry: retryUnlessClientError,
    },
    {
      toastId: "purchase-order-product-search-refetch-error",
      errorMessage: "No se pudo actualizar la búsqueda de productos. Mostrando los resultados anteriores.",
    },
  );

  return {
    productos: data?.productos ?? NO_PRODUCTS,
    /** La búsqueda también se cortó en su tope: hay más coincidencias. */
    truncado: data?.truncado ?? false,
    hasLoaded,
    isInitialError,
    /** Solo con `isInitialError`; ver `onboardingSearchRejection`. */
    error,
    isFetching,
    isPlaceholderData,
    refetch,
  };
};
