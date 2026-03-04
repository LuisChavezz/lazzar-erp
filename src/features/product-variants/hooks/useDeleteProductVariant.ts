import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteProductVariant } from "../services/actions";
import toast from "react-hot-toast";
import { ProductVariant } from "../interfaces/product-variant.interface";

export const useDeleteProductVariant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProductVariant,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["product-variants"] });
      const previousVariants =
        queryClient.getQueryData<ProductVariant[]>(["product-variants"]);

      if (previousVariants) {
        queryClient.setQueryData<ProductVariant[]>(
          ["product-variants"],
          (old) => (old ? old.filter((variant) => variant.id !== id) : [])
        );
      }

      return { previousVariants };
    },
    onError: (err, id, context) => {
      if (context?.previousVariants) {
        queryClient.setQueryData(["product-variants"], context.previousVariants);
      }
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
