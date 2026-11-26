"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { handleDrfWriteError } from "@/src/utils/drfWriteErrors";
import { createRfidReconciliation } from "../services/actions";
import type {
  CreateRfidReconciliationPayload,
  RfidReconciliation,
} from "../interfaces/rfid-reconciliation.interface";
import { rfidReconciliationLabel } from "../constants/rfidReconciliations";
import { refreshAfterRfidReconciliationChange } from "../utils/rfidReconciliationCache";
import type { RfidReconciliationFormField } from "../schemas/rfidReconciliation.schema";

/** Candado del alta: uno a la vez. */
export const createRfidReconciliationMutationKey = ["crear-encuadre-rfid"] as const;

const FORM_FIELDS: readonly RfidReconciliationFormField[] = [
  "almacen",
  "serie_codigo",
  "remision",
  "factura_referencia",
  "observaciones",
];

interface UseCreateRfidReconciliationOptions {
  /** Error del backend bajo su campo del paso 2. */
  onFieldError: (field: RfidReconciliationFormField, message: string) => void;
  onSuccess: (created: RfidReconciliation) => void;
}

/**
 * Alta de un encuadre (`POST /compras/recepcion-rfid-encuadres/`). Los errores
 * de un campo del formulario van bajo él; los de la orden (`tipo_origen`,
 * `orden_compra`, `op`), de la empresa o un `403` van en un toast con el
 * mensaje del backend, y releen el onboarding por si la orden ya no está.
 */
export const useCreateRfidReconciliation = ({ onFieldError, onSuccess }: UseCreateRfidReconciliationOptions) => {
  const queryClient = useQueryClient();
  return useMutation<RfidReconciliation, unknown, CreateRfidReconciliationPayload>({
    mutationKey: createRfidReconciliationMutationKey,
    mutationFn: createRfidReconciliation,
    onSuccess: (created) => {
      toast.success(`${rfidReconciliationLabel(created)} creado`);
      refreshAfterRfidReconciliationChange(queryClient);
      onSuccess(created);
    },
    onError: (error) => {
      let fieldErrors = 0;
      const message = handleDrfWriteError(error, "No se pudo crear el encuadre.", FORM_FIELDS, (field, text) => {
        fieldErrors += 1;
        onFieldError(field, text);
      });
      if (fieldErrors === 0) {
        toast.error(message);
        refreshAfterRfidReconciliationChange(queryClient);
      }
    },
  });
};
