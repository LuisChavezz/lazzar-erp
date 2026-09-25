import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getProducts } from "../services/actions";
import { Product } from "../interfaces/product.interface";

/**
 * La llave incluye `tipo_id` tal cual: una lista (`[1, 3]`) es una entrada de
 * caché DISTINTA de un tipo suelto (`3`), así que pedir varios tipos no pisa los
 * listados de un solo tipo. Invalidar la raíz `["products"]` alcanza a todas.
 *
 * No expone el `isError` crudo: un refetch fallido conserva `data` con
 * `status: 'error'`, y pasar ese valor a la UI cambiaba lo ya cargado por un
 * error. `isInitialError` solo es `true` si la consulta NUNCA cargó; un
 * refetch fallido con datos en caché avisa por toast (`useHasLoadedQuery`).
 * `error` sigue la misma regla (`null` salvo en ese caso). El `toastId` es uno
 * solo para todas las variantes de `tipo_id`, así que una invalidación de la
 * raíz que falle en varias llaves da un único toast.
 */
export const useProducts = (tipo_id?: number | string | readonly number[]) => {
  const { data, isLoading, isError, error, errorUpdatedAt } = useQuery<Product[]>({
    queryKey: ["products", tipo_id],
    queryFn: () => getProducts(tipo_id),
  });

  const products = data ?? [];

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "products-refetch-error",
  });

  return {
    products,
    isLoading,
    isInitialError,
    error: isInitialError ? error : null,
  };
};
