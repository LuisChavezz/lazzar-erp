import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getNextCatalogProductCode } from "../services/actions";
import type { NextCatalogProductCode } from "../interfaces/special-order.interface";

/**
 * Vista previa del código del producto de catálogo que crearía el alta de SKU
 * con `alta_catalogo` (`GET /catalogo/producto/siguiente-codigo/`). Llave
 * `["catalog-product-next-code", categoriaId]`.
 *
 * Solo se pide mientras la casilla está marcada (`enabled`). `staleTime: 0`:
 * el código no está reservado y cambia con cada alta en la categoría, así que
 * cada vez que se vuelve a marcar se pide de nuevo. Aun así es ORIENTATIVO.
 */
export const useNextCatalogProductCode = (categoriaId: number | null, enabled: boolean) => {
  const { data, isLoading, isInitialError } = useGuardedQuery<NextCatalogProductCode>(
    {
      queryKey: ["catalog-product-next-code", categoriaId],
      queryFn: () => getNextCatalogProductCode(categoriaId as number),
      enabled: enabled && categoriaId !== null,
      staleTime: 0,
    },
    { toastId: "catalog-product-next-code-refetch-error" },
  );

  return { codigo: data?.codigo ?? null, isLoading, isInitialError };
};
