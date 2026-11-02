import { keepPreviousData } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { searchPurchaseOrderProducts } from "../services/actions";

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
 */
export const usePurchaseOrderProductSearch = (productoQ: string, { enabled }: { enabled: boolean }) => {
  const { data, isInitialError, isFetching, isPlaceholderData, hasLoaded, refetch } = useGuardedQuery(
    {
      queryKey: ["purchase-order-product-search", productoQ],
      queryFn: () => searchPurchaseOrderProducts(productoQ),
      enabled: enabled && productoQ !== "",
      placeholderData: keepPreviousData,
    },
    {
      toastId: "purchase-order-product-search-refetch-error",
      errorMessage: "No se pudo actualizar la búsqueda de productos. Mostrando los resultados anteriores.",
    },
  );

  return {
    productos: data?.productos ?? [],
    /** La búsqueda también se cortó en su tope: hay más coincidencias. */
    truncado: data?.truncado ?? false,
    hasLoaded,
    isInitialError,
    isFetching,
    isPlaceholderData,
    refetch,
  };
};
