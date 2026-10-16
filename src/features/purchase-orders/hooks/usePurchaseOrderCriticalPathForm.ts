"use client";

import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import type { PurchaseOrderCriticalPath } from "../interfaces/purchase-order-critical-path.interface";
import {
  PurchaseOrderCriticalPathFields,
  purchaseOrderCriticalPathSchema,
  type PurchaseOrderCriticalPathField,
  type PurchaseOrderCriticalPathValues,
} from "../schemas/purchase-order-critical-path.schema";
import {
  buildPurchaseOrderCriticalPathBody,
  toPurchaseOrderCriticalPathValues,
} from "../utils/purchaseOrderCriticalPathForm";
import { useUpdatePurchaseOrderCriticalPath } from "./useUpdatePurchaseOrderCriticalPath";

interface UsePurchaseOrderCriticalPathFormParams {
  ocId: number;
  /** Registro guardado: la base contra la que se decide qué cambió. */
  data: PurchaseOrderCriticalPath;
  /** OC Cancelada o usuario sin `E-COMPRAS-OC`: se consulta, nunca envía. */
  readOnly: boolean;
}

/**
 * Formulario de la ruta crítica de la OC con TanStack Form. Copia adaptada de
 * `useCriticalPathForm` (OP): errores de cliente y de servidor con
 * `useFormFieldErrors`, los del servidor (400 por campo) llegan por
 * `setServerFieldError` desde el hook de mutación, y el PATCH lleva SOLO los campos que cambiaron. Sin el
 * manejo de 409 de la OP: el backend de la OC no bloquea por estatus.
 *
 * La base es el registro con que se montó el formulario. Tras guardar, la
 * mutación escribe el registro devuelto en la caché y el diálogo vuelve a
 * montar el formulario (`key` = `updated_at`), así que la nueva base es lo
 * recién guardado.
 */
export function usePurchaseOrderCriticalPathForm({
  ocId,
  data,
  readOnly,
}: UsePurchaseOrderCriticalPathFormParams) {
  const [initialValues] = useState<PurchaseOrderCriticalPathValues>(() =>
    toPurchaseOrderCriticalPathValues(data),
  );
  const {
    getError,
    setServerFieldError,
    setClientFieldError,
    clearClientFieldError,
    clearFieldErrors,
    replaceClientErrors,
    clearServerErrors,
  } = useFormFieldErrors<PurchaseOrderCriticalPathField>();
  // Envío en curso, síncrono: `isPending` llega hasta el siguiente render.
  const submittingRef = useRef(false);

  // Los 400 por campo los pinta `handleDrfWriteError` (en la mutación) con
  // `setServerFieldError`.
  const { mutateAsync, isPending } = useUpdatePurchaseOrderCriticalPath(ocId, setServerFieldError);

  /** Valida UN campo en blur. */
  const validateField = (
    field: PurchaseOrderCriticalPathField,
    values: PurchaseOrderCriticalPathValues,
  ) => {
    const parsed = PurchaseOrderCriticalPathFields[field].safeParse(values[field]);
    if (parsed.success) clearClientFieldError(field);
    else setClientFieldError(field, parsed.error.issues[0]?.message ?? "Valor inválido");
  };

  const validateForm = (values: PurchaseOrderCriticalPathValues): boolean => {
    const parsed = purchaseOrderCriticalPathSchema.safeParse(values);
    if (parsed.success) {
      replaceClientErrors({});
      return true;
    }
    const next: Partial<Record<PurchaseOrderCriticalPathField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as PurchaseOrderCriticalPathField;
      next[field] ??= issue.message;
    });
    replaceClientErrors(next);
    return false;
  };

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      // Solo lectura: el `fieldset` deshabilitado y el pie sin botón de guardar
      // ya lo impiden; esto garantiza que ningún camino dispare el PATCH.
      if (readOnly) return;
      clearServerErrors();
      if (!validateForm(value)) return;

      const body = buildPurchaseOrderCriticalPathBody(value, initialValues);
      // El botón ya está deshabilitado sin cambios; esto cubre el Enter.
      if (Object.keys(body).length === 0) return;

      try {
        await mutateAsync({ ocId, body });
      } catch {
        // El toast ya lo dio el hook; los errores por campo quedan bajo su
        // campo y el formulario conserva lo capturado para reintentar.
      }
    },
  });

  /** ¿Hay algo que guardar? Decide si el botón de guardar se habilita. */
  const hasChanges = (values: PurchaseOrderCriticalPathValues) =>
    Object.keys(buildPurchaseOrderCriticalPathBody(values, initialValues)).length > 0;

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (submittingRef.current) return;
    submittingRef.current = true;
    void form.handleSubmit().finally(() => {
      submittingRef.current = false;
    });
  };

  return {
    form,
    isPending,
    hasChanges,
    getError,
    clearFieldErrors,
    validateField,
    handleFormSubmit,
  };
}
