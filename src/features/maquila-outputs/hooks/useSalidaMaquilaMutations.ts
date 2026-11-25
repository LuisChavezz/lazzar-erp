import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createSalidaMaquila } from "../services/actions";
import { salidaMaquilaFolio } from "../constants/salidaMaquilaOrigen";
import type { CreateSalidaMaquilaBody, SalidaMaquilaOrigen } from "../interfaces/salida-maquila.interface";

/** Una SM no cambia su orden de origen, pero sí todas las listas de SM (prefijo). */
const useRefresh = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["salidas-maquila"] });
};

/** Alta desde una orden. Llave por orden: candado contra el doble envío. */
export const useCreateSalidaMaquila = (origen: SalidaMaquilaOrigen, ordenId: number) => {
  const refresh = useRefresh();
  return useMutation({
    mutationKey: ["salida-maquila-crear", origen, ordenId],
    mutationFn: (body: CreateSalidaMaquilaBody) => createSalidaMaquila(body),
    onSuccess: (sm) => {
      toast.success(`Salida a maquila ${salidaMaquilaFolio(sm)} generada.`);
      return refresh();
    },
  });
};
