import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getSizesByCategory } from "../services/actions";
import { Size } from "../interfaces/size.interface";

interface UseSizesByCategoryParams {
  /** Categoría del producto; `null` = el producto no tiene categoría (catálogo completo). */
  categoriaProductoId: number | null;
  /** Solo se consulta cuando hay un producto elegido que necesita talla. */
  enabled: boolean;
}

/**
 * Tallas permitidas para la categoría del producto elegido. Filtrar aquí evita
 * ofrecer una talla que el backend rechazaría con "Esta talla no esta permitida
 * para la categoria de este producto."
 *
 * Llave bajo la raíz `["sizes"]` para que las invalidaciones del catálogo de
 * tallas también la alcancen, pero distinta de `["sizes"]` (catálogo completo).
 *
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useSizesByCategory = ({ categoriaProductoId, enabled }: UseSizesByCategoryParams) => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<Size[]>(
    {
      queryKey: ["sizes", "by-category", categoriaProductoId],
      queryFn: () => getSizesByCategory(categoriaProductoId),
      enabled,
    },
    { toastId: "sizes-by-category-refetch-error" },
  );

  const sizes = data ?? [];

  return {
    sizes,
    isLoading,
    isInitialError,
    error,
  };
};
