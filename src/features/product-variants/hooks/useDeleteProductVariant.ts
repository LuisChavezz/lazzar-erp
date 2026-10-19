import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteProductVariant } from "../services/actions";
import toast from "react-hot-toast";
import { ProductVariant } from "../interfaces/product-variant.interface";

export const useDeleteProductVariant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProductVariant,
    // Ninguna consulta usa la llave exacta `["product-variants"]`: los listados
    // son `["product-variants", con_bom]`. Por eso todo va por prefijo.
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["product-variants"] });
      const previousVariants = queryClient.getQueriesData<ProductVariant[]>({
        queryKey: ["product-variants"],
      });

      // Solo se filtran entradas que sean arreglos; devolver `undefined` deja
      // intacta cualquier otra.
      queryClient.setQueriesData<ProductVariant[]>({ queryKey: ["product-variants"] }, (old) =>
        Array.isArray(old) ? old.filter((variant) => variant.id !== id) : undefined
      );

      return { previousVariants };
    },
    onError: (err, id, context) => {
      context?.previousVariants.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      console.error(err);
      toast.error("Error al eliminar la variante");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["product-variants"] });
    },
    onSuccess: () => {
      toast.success("Variante eliminada correctamente");
    },
  });
};
