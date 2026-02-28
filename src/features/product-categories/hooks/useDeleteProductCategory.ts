import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteProductCategory } from "../services/actions";
import toast from "react-hot-toast";
import { ProductCategory } from "../interfaces/product-category.interface";

export const useDeleteProductCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProductCategory,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["product-categories"] });
      const previousCategories = queryClient.getQueryData<ProductCategory[]>(["product-categories"]);

      if (previousCategories) {
        queryClient.setQueryData<ProductCategory[]>(["product-categories"], (old) =>
          old ? old.filter((category) => category.id !== id) : []
        );
      }

      return { previousCategories };
    },
    onError: (err, id, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(["product-categories"], context.previousCategories);
      }
      console.error(err);
      toast.error("Error al eliminar la categoría");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
    },
    onSuccess: () => {
      toast.success("Categoría eliminada correctamente");
    },
  });
};
