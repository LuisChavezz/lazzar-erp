import { useQuery } from "@tanstack/react-query";
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
 */
export const useSizesByCategory = ({ categoriaProductoId, enabled }: UseSizesByCategoryParams) => {
  const {
    data: sizes = [],
    isLoading,
    isError,
    error,
  } = useQuery<Size[]>({
    queryKey: ["sizes", "by-category", categoriaProductoId],
    queryFn: () => getSizesByCategory(categoriaProductoId),
    enabled,
  });

  return {
    sizes,
    isLoading,
    isError,
    error,
  };
};
