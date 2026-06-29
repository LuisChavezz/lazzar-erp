import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchBomMateriaPrima } from "../services/actions";
import type { BomDetalle } from "../interfaces/bom.interface";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

/**
 * Actualiza (reemplaza) los renglones de materia prima de una lista de
 * materiales existente. Invalida la query `["bom"]` para refrescar cualquier
 * vista de BOM cacheada (la key de `useBom` es `["bom", productoVarianteId]`,
 * que coincide por prefijo).
 */
export const usePatchBomMateriaPrima = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bom_id,
      materia_prima_detalle,
    }: {
      bom_id: number;
      materia_prima_detalle: BomDetalle[];
    }) => patchBomMateriaPrima(bom_id, materia_prima_detalle),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bom"] });
      toast.success("Lista de materiales actualizada correctamente");
    },

    onError: (error) => {
      if (error instanceof AxiosError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;
        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;
          const firstMessage = Object.values(validationErrors).flat()[0];
          if (firstMessage) {
            toast.error(firstMessage);
            return;
          }
        }
      }
      toast.error("Error al actualizar la lista de materiales");
    },
  });
};
