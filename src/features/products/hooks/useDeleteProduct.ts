import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteProduct } from "../services/actions";
import toast from "react-hot-toast";

/**
 * Baja (lógica) de un producto. Sin escritura optimista: las tablas de
 * catálogo van en modo servidor (`["products", "table", …]`, EC-897) y los
 * selectores (`["products", "selector", params]`) guardan sobres paginados, y
 * la página a la que pertenece un producto depende de filtros y orden. Se
 * invalida el prefijo `["products"]` y todo se relee.
 */
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    onError: (err) => {
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
