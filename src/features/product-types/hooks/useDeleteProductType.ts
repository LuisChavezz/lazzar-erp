import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteProductType } from "../services/actions";
import toast from "react-hot-toast";
import { ProductType } from "../interfaces/product-type.interface";

export const useDeleteProductType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProductType,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["product-types"] });
      const previousProductTypes = queryClient.getQueryData<ProductType[]>(["product-types"]);

      if (previousProductTypes) {
        queryClient.setQueryData<ProductType[]>(["product-types"], (old) =>
          old ? old.filter((productType) => productType.id !== id) : []
        );
      }

      return { previousProductTypes };
    },
    onError: (err, id, context) => {
      if (context?.previousProductTypes) {
        queryClient.setQueryData(["product-types"], context.previousProductTypes);
      }
      console.error(err);
      toast.error("Error al eliminar el tipo de producto");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
    },
    onSuccess: () => {
      toast.success("Tipo de producto eliminado correctamente");
    },
  });
};
