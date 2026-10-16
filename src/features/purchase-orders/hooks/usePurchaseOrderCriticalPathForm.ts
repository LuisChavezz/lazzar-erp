"use client";

import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
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

type FieldErrors = Partial<Record<PurchaseOrderCriticalPathField, string>>;

interface UsePurchaseOrderCriticalPathFormParams {
  ocId: number;
  /** Registro guardado: la base contra la que se decide qué cambió. */
  data: PurchaseOrderCriticalPath;
  /** OC Cancelada o usuario sin `E-COMPRAS-OC`: se consulta, nunca envía. */
  readOnly: boolean;
}

/**
 * Formulario de la ruta crítica de la OC con TanStack Form. Copia adaptada de
 * `useCriticalPathForm` (OP): errores de cliente y de servidor en estados
 * separados, los del servidor (400 por campo) llegan por `setFieldError` del
 * hook de mutación, y el PATCH lleva SOLO los campos que cambiaron. Sin el
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
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  // Envío en curso, síncrono: `isPending` llega hasta el siguiente render.
  const submittingRef = useRef(false);

  const { mutateAsync, isPending } = useUpdatePurchaseOrderCriticalPath(ocId, (field, message) =>
    setServerErrors((previous) => ({ ...previous, [field]: message })),
  );

  const removeError = (errors: FieldErrors, field: PurchaseOrderCriticalPathField): FieldErrors => {
    if (!(field in errors)) return errors;
    const next = { ...errors };
    delete next[field];
    return next;
  };

  const clearFieldErrors = (field: PurchaseOrderCriticalPathField) => {
    setClientErrors((previous) => removeError(previous, field));
    setServerErrors((previous) => removeError(previous, field));
  };

  /** Valida UN campo en blur. */
  const validateField = (
    field: PurchaseOrderCriticalPathField,
    values: PurchaseOrderCriticalPathValues,
  ) => {
    const parsed = PurchaseOrderCriticalPathFields[field].safeParse(values[field]);
    setClientErrors((previous) =>
      parsed.success
        ? removeError(previous, field)
        : { ...previous, [field]: parsed.error.issues[0]?.message ?? "Valor inválido" },
    );
  };

  const validateForm = (values: PurchaseOrderCriticalPathValues): boolean => {
    const parsed = purchaseOrderCriticalPathSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }
    const next: FieldErrors = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as PurchaseOrderCriticalPathField;
      next[field] ??= issue.message;
    });
    setClientErrors(next);
    return false;
  };

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      // Solo lectura: el `fieldset` deshabilitado y el pie sin botón de guardar
      // ya lo impiden; esto garantiza que ningún camino dispare el PATCH.
      if (readOnly) return;
      setServerErrors({});
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

  const getError = (field: PurchaseOrderCriticalPathField): FormFieldError | undefined => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

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
