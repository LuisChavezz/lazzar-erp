import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteProduct } from "../services/actions";
import toast from "react-hot-toast";
import { Product } from "../interfaces/product.interface";

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    // Ninguna consulta usa la llave exacta `["products"]`: los listados son
    // `["products", tipo_id]` y el detalle `["products", "detail", id]`. Por eso
    // todo va por prefijo.
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["products"] });
      const previousProducts = queryClient.getQueriesData<Product[] | Product>({
        queryKey: ["products"],
      });

      // Solo se filtran los listados (arreglos). Devolver `undefined` deja la
      // entrada intacta, así el detalle (un objeto) no se toca.
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
