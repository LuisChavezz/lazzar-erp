"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { drfActionErrorMessage, isDrfActionRejection, isNotFoundError } from "@/src/utils/drfWriteErrors";
import { acceptRfidReconciliation } from "../services/actions";
import type { RfidReconciliation } from "../interfaces/rfid-reconciliation.interface";
import {
  applyRfidReconciliationStatus,
  refreshAfterRfidReconciliationChange,
} from "../utils/rfidReconciliationCache";

/** Candado por encuadre: frena el doble envío aunque el diálogo se vuelva a montar. */
export const acceptRfidReconciliationMutationKey = (id: number) => ["aceptar-encuadre-rfid", id] as const;

/**
 * Aceptar un encuadre (`POST .../{id}/aceptar/`). Escribe el estatus en caché
 * antes de invalidar (EC-927). Un `400 {"estatus"}` (se canceló o aceptó en
 * otro lado, también si perdió la carrera contra un `cancelar/`) o un `404`
 * muestran el mensaje del backend y releen el encuadre para que la acción
 * deje de ofrecerse.
 */
export const useAcceptRfidReconciliation = (id: number, onAccepted?: (result: RfidReconciliation) => void) => {
  const queryClient = useQueryClient();
  return useMutation<RfidReconciliation, unknown, void>({
    mutationKey: acceptRfidReconciliationMutationKey(id),
    mutationFn: () => acceptRfidReconciliation(id),
    onSuccess: async (result) => {
      await applyRfidReconciliationStatus(queryClient, id, result);
      refreshAfterRfidReconciliationChange(queryClient);
      toast.success("Encuadre aceptado");
      onAccepted?.(result);
    },
    onError: (error) => {
      toast.error(
        drfActionErrorMessage(error, "No se pudo aceptar el encuadre.", "El encuadre ya no está disponible."),
      );
      if (isDrfActionRejection(error) || isNotFoundError(error)) refreshAfterRfidReconciliationChange(queryClient);
    },
  });
};
