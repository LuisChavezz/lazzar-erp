import { useQuery } from "@tanstack/react-query";
import { getProducts } from "../services/actions";
import { Product } from "../interfaces/product.interface";

/**
 * La llave incluye `tipo_id` tal cual: una lista (`[1, 3]`) es una entrada de
 * caché DISTINTA de un tipo suelto (`3`), así que pedir varios tipos no pisa los
 * listados de un solo tipo. Invalidar la raíz `["products"]` alcanza a todas.
 */
export const useProducts = (tipo_id?: number | string | readonly number[]) => {
  const {
    data: products = [],
    isLoading,
    isError,
    error,
  } = useQuery<Product[]>({
    queryKey: ["products", tipo_id],
    queryFn: () => getProducts(tipo_id),
  });

  return {
    products,
    isLoading,
    isError,
    error,
  };
};
