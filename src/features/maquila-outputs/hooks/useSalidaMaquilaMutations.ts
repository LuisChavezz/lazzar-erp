import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import {
  cancelarSalidaMaquila,
  cerrarSalidaMaquila,
  createSalidaMaquila,
} from "../services/actions";
import type { CreateSalidaMaquilaBody } from "../interfaces/salida-maquila.interface";

export const salidaMaquilaErrorText = (error: unknown, fallback: string) => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 403) return "No tienes permiso de Producción para esta acción.";
  return firstDrfFieldMessage(error) ?? extractErrorMessage(error, fallback);
};

/** Una SM no cambia la OP, pero sí todas las listas de SM (prefijo). */
const useRefresh = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["salidas-maquila"] });
};

export const useCreateSalidaMaquila = (opId: number) => {
  const refresh = useRefresh();
  return useMutation({
    mutationKey: ["salida-maquila-crear", opId],
    mutationFn: (body: CreateSalidaMaquilaBody) => createSalidaMaquila(body),
    onSuccess: (sm) => {
      toast.success(`Salida a maquila ${sm.folio} generada.`);
      return refresh();
    },
  });
};

/** Cerrar (recibida) y cancelar. Llave por registro: candado contra el doble envío. */
export const useSalidaMaquilaActions = (id: number) => {
  const refresh = useRefresh();
  const cerrar = useMutation({
    mutationKey: ["salida-maquila-cerrar", id],
    mutationFn: () => cerrarSalidaMaquila(id),
    onSuccess: (sm) => {
      toast.success(`${sm.folio} marcada como recibida.`);
      return refresh();
    },
    onError: (error) => toast.error(salidaMaquilaErrorText(error, "No se pudo marcar como recibida.")),
  });
  const cancelar = useMutation({
    mutationKey: ["salida-maquila-cancelar", id],
    mutationFn: () => cancelarSalidaMaquila(id),
    onSuccess: (sm) => {
      toast.success(`${sm.folio} cancelada.`);
      return refresh();
    },
    onError: (error) => toast.error(salidaMaquilaErrorText(error, "No se pudo cancelar la salida.")),
  });
  return { cerrar, cancelar };
};
