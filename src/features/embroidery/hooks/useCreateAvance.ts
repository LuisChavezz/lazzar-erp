import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { createAvance } from "../services/actions";

/**
 * Mutación de alta de un avance de bordado
 * (`POST /produccion/bordado-avances/`). La OB padre viaja en el payload
 * (`variables.ob`), así que el hook no necesita un parámetro aparte.
 *
 * Invalida `["embroidery-order-detail", ob]`: los `avances` y el
 * `resumen_avance` viven SOLO en el detalle, así que el re-fetch de esa llave
 * es lo que muestra el avance recién creado y el resumen recalculado.
 */
export const useCreateAvance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAvance,
    onSuccess: (_avance, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["embroidery-order-detail", variables.ob],
      });
      toast.success("Avance registrado correctamente");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "No se pudo registrar el avance"));
    },
  });
};
