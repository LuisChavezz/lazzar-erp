import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { deleteAvance } from "../services/actions";

/**
 * Mutación de baja de un avance de bordado
 * (`DELETE /produccion/bordado-avances/{id}/`). El id de la OB padre se fija al
 * crear el hook —la respuesta del DELETE no lo trae—; `mutate` recibe el id del
 * avance a eliminar.
 *
 * Invalida `["embroidery-order-detail", obId]`: los `avances` y el
 * `resumen_avance` viven SOLO en el detalle, así que el re-fetch de esa llave
 * es lo que refleja la baja y el resumen recalculado.
 */
export const useDeleteAvance = (obId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (avanceId: number) => deleteAvance(avanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["embroidery-order-detail", obId],
      });
      toast.success("Avance eliminado correctamente");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "No se pudo eliminar el avance"));
    },
  });
};
