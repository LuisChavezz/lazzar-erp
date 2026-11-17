import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteProduct } from "../services/actions";
import toast from "react-hot-toast";
import { Product } from "../interfaces/product.interface";

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    // Ninguna consulta usa la llave exacta `["products"]`: las tablas de
    // catálogo (`["products", "table", …]`, EC-897) y los selectores
    // (`["products", "selector", params]`) guardan sobres paginados, no
    // arreglos. Por eso todo va por prefijo.
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["products"] });
      const previousProducts = queryClient.getQueriesData<Product[] | Product>({
        queryKey: ["products"],
      });

      // Solo se filtran entradas que sean arreglos (hoy ninguna). Devolver
      // `undefined` deja la entrada intacta, así las páginas de las tablas y
      // los selectores (un objeto) no se tocan: se refrescan con la
      // invalidación de `onSettled`, como pide el modo servidor.
      queryClient.setQueriesData<Product[] | Product>({ queryKey: ["products"] }, (old) =>
        Array.isArray(old) ? old.filter((product) => product.id !== id) : undefined
      );

      return { previousProducts };
    },
    onError: (err, id, context) => {
      context?.previousProducts.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      console.error(err);
      toast.error("Error al eliminar el producto");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onSuccess: () => {
      toast.success("Producto eliminado correctamente");
    },
  });
};
