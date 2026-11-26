"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createSupplierReturn } from "../services/actions";
import type { CreateSupplierReturnPayload, SupplierReturn } from "../interfaces/supplier-return.interface";
import { supplierReturnLabel } from "../constants/supplierReturns";
import { refreshAfterSupplierReturnChange } from "../utils/supplierReturnActions";
import {
  routeSupplierReturnCreateError,
  type SupplierReturnFormField,
} from "../utils/supplierReturnCreateErrors";

export type { SupplierReturnFormField };

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
 * Errores: los reparte `routeSupplierReturnCreateError` (función pura, con
 * pruebas): `motivo`, `calidad_inspeccion` y `detalles` bajo su control, los
 * dos últimos releyendo lo pendiente; toast para lo que no cabe en un campo
 * (`folio`), un `403` o un fallo de red o 5xx.
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
      const route = routeSupplierReturnCreateError(error);
      for (const [field, text] of route.fieldErrors) onFieldError(field, text);
      if (route.refreshPending) refreshAfterSupplierReturnChange(queryClient);
      if (route.toast !== null) toast.error(route.toast);
    },
  });
};
