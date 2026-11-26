"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { handleDrfWriteError, isForbiddenError } from "@/src/utils/drfWriteErrors";
import { createSupplierReturn } from "../services/actions";
import type { CreateSupplierReturnPayload, SupplierReturn } from "../interfaces/supplier-return.interface";
import { supplierReturnLabel } from "../constants/supplierReturns";
import { refreshAfterSupplierReturnChange } from "../utils/supplierReturnActions";

/** Campos del `400` que el diálogo pinta junto a su control. */
export const SUPPLIER_RETURN_FORM_FIELDS = ["motivo", "detalles", "calidad_inspeccion"] as const;
export type SupplierReturnFormField = (typeof SUPPLIER_RETURN_FORM_FIELDS)[number];

const FALLBACK_ERROR = "No se pudo registrar la devolución. Intenta de nuevo.";

/** Candado del alta: uno a la vez, abra el diálogo quien lo abra. */
export const createSupplierReturnMutationKey = ["crear-devolucion-proveedor"] as const;

interface UseCreateSupplierReturnOptions {
  /** Error del backend bajo su campo (`motivo`, `detalles`, `calidad_inspeccion`). */
  onFieldError: (field: SupplierReturnFormField, message: string) => void;
  onSuccess: (dev: SupplierReturn) => void;
}

/**
 * Alta de una devolución a proveedor (`POST /compras/devoluciones-proveedor/`).
 *
 * Errores `400` (`handleDrfWriteError`): `motivo` (falta), `calidad_inspeccion`
 * (anulada o no encontrada) y `detalles` (nada pendiente, cantidad no numérica o
 * mayor a la pendiente) van bajo su control; los dos últimos además releen lo
 * pendiente (`refreshAfterSupplierReturnChange`), porque significan que otra
 * sesión ya devolvió o revirtió. Solo sale toast si el mensaje no cupo en un
 * campo (p. ej. `folio`, la serie no pudo generar el folio), en un `403` (sin
 * `C-WMS-RECEPCIONES`) o en un fallo de red o 5xx.
 */
export const useCreateSupplierReturn = ({ onFieldError, onSuccess }: UseCreateSupplierReturnOptions) => {
  const queryClient = useQueryClient();
  return useMutation<SupplierReturn, unknown, CreateSupplierReturnPayload>({
    mutationKey: createSupplierReturnMutationKey,
    mutationFn: createSupplierReturn,
    onSuccess: (dev) => {
      toast.success(`Devolución ${supplierReturnLabel(dev)} registrada`);
      refreshAfterSupplierReturnChange(queryClient);
      onSuccess(dev);
    },
    onError: (error) => {
      const fieldsSet = new Set<SupplierReturnFormField>();
      const message = handleDrfWriteError(error, FALLBACK_ERROR, SUPPLIER_RETURN_FORM_FIELDS, (field, text) => {
        fieldsSet.add(field);
        onFieldError(field, text);
      });
      if (fieldsSet.has("detalles") || fieldsSet.has("calidad_inspeccion")) {
        refreshAfterSupplierReturnChange(queryClient);
      }
      if (fieldsSet.size === 0 || isForbiddenError(error) || message !== FALLBACK_ERROR) {
        toast.error(message);
      }
    },
  });
};
