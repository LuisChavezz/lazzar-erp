import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import {
  cancelarSalidaMaquila,
  createSalidaMaquila,
} from "../services/actions";
import { salidaMaquilaFolio } from "../constants/salidaMaquilaOrigen";
import { SALIDA_MAQUILA_FORBIDDEN_TEXT } from "../utils/salidaMaquilaErrors";
import type { CreateSalidaMaquilaBody, SalidaMaquilaOrigen } from "../interfaces/salida-maquila.interface";

export const salidaMaquilaErrorText = (error: unknown, fallback: string) => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 403) return SALIDA_MAQUILA_FORBIDDEN_TEXT;
  return firstDrfFieldMessage(error) ?? extractErrorMessage(error, fallback);
};

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

/** Cancelar (solo desde ENVIADA). Llave por registro: candado contra el doble envío. */
export const useCancelarSalidaMaquila = (id: number) => {
  const refresh = useRefresh();
  return useMutation({
    mutationKey: ["salida-maquila-cancelar", id],
    mutationFn: () => cancelarSalidaMaquila(id),
    onSuccess: (sm) => {
      toast.success(`${salidaMaquilaFolio(sm)} cancelada.`);
      return refresh();
    },
    onError: (error) => toast.error(salidaMaquilaErrorText(error, "No se pudo cancelar la salida.")),
  });
};
