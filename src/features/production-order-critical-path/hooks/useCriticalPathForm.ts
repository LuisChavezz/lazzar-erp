"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import type { ProductionOrderCriticalPath } from "../interfaces/production-order-critical-path.interface";
import {
  CriticalPathFields,
  criticalPathSchema,
  type CriticalPathField,
  type CriticalPathValues,
} from "../schemas/production-order-critical-path.schema";
import { buildCriticalPathBody, toCriticalPathValues } from "../utils/criticalPathForm";
import { useUpdateProductionOrderCriticalPath } from "./useUpdateProductionOrderCriticalPath";

type FieldErrors = Partial<Record<CriticalPathField, string>>;

interface UseCriticalPathFormParams {
  opId: number;
  /** Registro guardado: la base contra la que se decide qué cambió. */
  data: ProductionOrderCriticalPath;
  /** Avisa si hay captura sin guardar (el diálogo no remonta mientras la haya). */
  onDirtyChange: (dirty: boolean) => void;
  /** Guardado con éxito: `updated_at` del registro que devolvió el PATCH. */
  onSaved: (updatedAt: string) => void;
}

/**
 * Formulario de la ruta crítica con TanStack Form. Mismo esquema que
 * `useAttendanceCorrectionForm`: errores de cliente y de servidor en estados
 * separados, los del servidor (400 por campo) llegan por `setFieldError` del
 * hook de mutación, y el PATCH lleva SOLO los campos que cambiaron.
 *
 * La base es el registro con que se montó el formulario. Tras guardar, el
 * diálogo vuelve a montarlo (`onSaved` → `key`), así que la nueva base es lo
 * recién guardado. Mientras haya captura sin guardar (`onDirtyChange`), un
 * registro más nuevo que llegue por otro lado NO lo remonta.
 */
export function useCriticalPathForm({
  opId,
  data,
  onDirtyChange,
  onSaved,
}: UseCriticalPathFormParams) {
  const [initialValues] = useState<CriticalPathValues>(() => toCriticalPathValues(data));

  // Una cantidad guardada con fracción ("120.50") se señala desde la apertura:
  // no se redondea en silencio, y bloquea el guardado hasta corregirla.
  const [clientErrors, setClientErrors] = useState<FieldErrors>(() => {
    const parsed = CriticalPathFields.cantidad_real_corte.safeParse(
      initialValues.cantidad_real_corte
    );
    return parsed.success ? {} : { cantidad_real_corte: parsed.error.issues[0]?.message };
  });
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  // Envío en curso, síncrono: `isPending` llega hasta el siguiente render.
  const submittingRef = useRef(false);

  const { mutateAsync, isPending } = useUpdateProductionOrderCriticalPath((field, message) =>
    setServerErrors((previous) => ({ ...previous, [field]: message }))
  );

  const removeError = (errors: FieldErrors, field: CriticalPathField): FieldErrors => {
    if (!(field in errors)) return errors;
    const next = { ...errors };
    delete next[field];
    return next;
  };

  const clearFieldErrors = (field: CriticalPathField) => {
    setClientErrors((previous) => removeError(previous, field));
    setServerErrors((previous) => removeError(previous, field));
  };

  /** Valida UN campo en blur. */
  const validateField = (field: CriticalPathField, values: CriticalPathValues) => {
    const parsed = CriticalPathFields[field].safeParse(values[field]);
    setClientErrors((previous) =>
      parsed.success
        ? removeError(previous, field)
        : { ...previous, [field]: parsed.error.issues[0]?.message ?? "Valor inválido" }
    );
  };

  const validateForm = (values: CriticalPathValues): boolean => {
    const parsed = criticalPathSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }
    const next: FieldErrors = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as CriticalPathField;
      next[field] ??= issue.message;
    });
    setClientErrors(next);
    return false;
  };

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});
      if (!validateForm(value)) return;

      const body = buildCriticalPathBody(value, initialValues);
      // El botón ya está deshabilitado sin cambios; esto cubre el Enter.
      if (Object.keys(body).length === 0) return;

      try {
        const saved = await mutateAsync({ opId, body });
        onSaved(saved.updated_at);
      } catch {
        // El toast ya lo dio el hook; los errores por campo quedan bajo su
        // campo y el formulario conserva lo capturado para reintentar.
      }
    },
  });

  /** ¿Hay algo que guardar? Decide si el botón de guardar se habilita. */
  const hasChanges = (values: CriticalPathValues) =>
    Object.keys(buildCriticalPathBody(values, initialValues)).length > 0;

  const isDirty = useStore(form.store, (state) => hasChanges(state.values));
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const getError = (field: CriticalPathField): FormFieldError | undefined => {
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
