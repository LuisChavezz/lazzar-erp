import { useQuery } from "@tanstack/react-query";
import { getProduct } from "../services/actions";
import { Product } from "../interfaces/product.interface";

/**
 * Detalle de UN producto por id (`0` = ninguno, no consulta).
 *
 * La llave vive bajo la raíz `["products"]` para que las mutaciones de
 * productos (que invalidan esa raíz) también la refresquen. El segmento
 * `"detail"` evita chocar con los listados por tipo (`["products", 3]`).
 */
export const useProduct = (productId: number, { enabled = true }: { enabled?: boolean } = {}) => {
  const {
    data: product,
    isLoading,
    isError,
    error,
  } = useQuery<Product>({
    queryKey: ["products", "detail", productId],
    queryFn: () => getProduct(productId),
    enabled: enabled && productId > 0,
  });

  return {
    product,
    isLoading,
    isError,
    error,
  };
};
