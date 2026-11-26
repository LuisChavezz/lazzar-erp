import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import type { CreateRfidLectorPayload, RfidLectorConfig } from "../interfaces/rfid-scanner.interface";
import {
  createRfidLector,
  deleteRfidLector,
  fetchRfidLectores,
  regenerarTokenRfidLector,
} from "../services/actions";

const KEY = ["rfid-lectores"] as const;

/**
 * Catálogo de lectores. Un 404 es definitivo: el endpoint aún no existe en el
 * backend y la vista lo dice en vez de mostrar una lista vacía. El estado se
 * refresca cada 30 s, como `scanner-stats`.
 */
export const useRfidLectores = () => {
  const q = useGuardedQuery<RfidLectorConfig[]>(
    { queryKey: KEY, queryFn: fetchRfidLectores, refetchInterval: 30_000 },
    { toastId: "rfid-lectores-refetch-error", isDefinitiveError: isNotFoundError },
  );
  return {
    lectores: q.data ?? [],
    hasLoaded: q.hasLoaded,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    isInitialError: q.isInitialError,
    noDisponible: q.isDefinitiveError,
    refetch: q.refetch,
  };
};

/** Error de validación del backend en `nombre`, o el mensaje general. */
const createErrorMessage = (error: unknown) => {
  const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
  return firstDrfMessage(data?.nombre) ?? extractErrorMessage(error, "No se pudo agregar el lector");
};

export const useCreateRfidLector = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRfidLectorPayload) => createRfidLector(payload),
    onSuccess: (lector) => {
      toast.success(`Lector "${lector.nombre}" agregado`);
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["rfid-scanner-stats"] });
    },
    onError: (error) => toast.error(createErrorMessage(error)),
  });
};

export const useDeleteRfidLector = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lector: RfidLectorConfig) => deleteRfidLector(lector.id),
    onMutate: async (lector) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<RfidLectorConfig[]>(KEY);
      qc.setQueryData<RfidLectorConfig[]>(KEY, (old) => old?.filter((l) => l.id !== lector.id));
      return { prev };
    },
    onError: (error, _l, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
      toast.error(extractErrorMessage(error, "No se pudo eliminar el lector"));
    },
    onSuccess: (_d, lector) => toast.success(`Lector "${lector.nombre}" eliminado`),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["rfid-scanner-stats"] });
    },
  });
};

/** Regenera el token: el anterior deja de servir de inmediato. */
export const useRegenerarTokenRfidLector = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lector: RfidLectorConfig) => regenerarTokenRfidLector(lector.id),
    onSuccess: (_d, lector) => {
      toast.success(`Token de "${lector.nombre}" regenerado`);
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (error) => toast.error(extractErrorMessage(error, "No se pudo regenerar el token")),
  });
};
