import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createListaMaterial } from "../services/actions";
import type { ListaMaterialCreate } from "../interfaces/bom.interface";
import toast from "react-hot-toast";
import { toastDrfError } from "@/src/utils/toastDrfError";

export const useCreateListaMaterial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ListaMaterialCreate) => createListaMaterial(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bom"] });
      // `tiene_bom` del selector de variantes (alta de OP) depende de las
      // listas de materiales: sin esto, la variante seguiría como "Sin BOM"
      // hasta que venciera la caché.
      queryClient.invalidateQueries({ queryKey: ["product-variants"] });
      toast.success("Lista de materiales registrada correctamente");
    },
    onError: (error) => toastDrfError(error, "Error al registrar la lista de materiales"),
  });
};
