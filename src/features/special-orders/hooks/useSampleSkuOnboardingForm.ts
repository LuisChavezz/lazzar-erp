"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import type { FormFieldError } from "@/src/utils/getFieldError";
import type {
  SampleSkuOnboardingPayload,
  SpecialOrderLine,
} from "../interfaces/special-order.interface";
import {
  buildSampleSkuOnboardingSchema,
  type SampleSkuOnboardingFormValues,
  type SampleSkuOnboardingMaterialFormValues,
} from "../schemas/sample-sku-onboarding.schema";
import { useCreateSampleSkuOnboarding } from "./useCreateSampleSkuOnboarding";

interface UseSampleSkuOnboardingFormParams {
  pedidoId: number;
  line: SpecialOrderLine;
  /** Tras un alta exitosa: cierra el diálogo. */
  onSuccess: () => void;
  /**
   * El backend rechazó el color y la línea lo captura en el Paso 1: el
   * asistente regresa ahí para que el error quede a la vista.
   */
  onColorRejected: () => void;
}

/** Defaults del backend: desperdicio 0, obligatorio `true`. */
const newMaterialRow = (componente: number): SampleSkuOnboardingMaterialFormValues => ({
  componente,
  cantidad: "",
  unidad: 0,
  desperdicio: "0",
  obligatorio: true,
});

/**
 * Formulario del alta de SKU de muestra. Vive en el orquestador del asistente
 * (no en un paso), así que sobrevive al ir y volver entre pasos.
 *
 * Misma convención que `useCreateBomForm`: `useForm` con `defaultValues`
 * planos, validación Zod manual con `safeParse` al enviar y errores indexados
 * por la ruta del issue unida con "." (`materia_prima_detalle.0.cantidad`).
 * Los errores del servidor llegan con esas mismas llaves (ver
 * `parseSampleSkuOnboardingError`).
 */
export function useSampleSkuOnboardingForm({
  pedidoId,
  line,
  onSuccess,
  onColorRejected,
}: UseSampleSkuOnboardingFormParams) {
  // El detalle no expone el id del color: solo se sabe si la línea tiene uno.
  const requiresColor = line.color_nombre === null;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const { mutateAsync: createOnboarding, isPending } = useCreateSampleSkuOnboarding(
    pedidoId,
    (parsed) => {
      const { color: colorError, ...restErrors } = parsed.fieldErrors;
      if (colorError && requiresColor) {
        setErrors(parsed.fieldErrors);
        setFormError(parsed.formError ?? null);
        onColorRejected();
        return;
      }
      // Línea CON color: no hay selector donde pintar el error, va al aviso.
      setErrors(restErrors);
      setFormError(parsed.formError ?? colorError ?? null);
    },
  );

  const form = useForm({
    defaultValues: {
      color: 0,
      materia_prima_detalle: [],
    } as SampleSkuOnboardingFormValues,
    onSubmit: async ({ value }) => {
      const parsed = buildSampleSkuOnboardingSchema(requiresColor).safeParse(value);

      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const key = issue.path.join(".");
          nextErrors[key] ??= issue.message;
        });
        setErrors(nextErrors);
        setFormError(nextErrors.materia_prima_detalle ?? null);
        if (nextErrors.color) onColorRejected();
        return;
      }

      setErrors({});
      setFormError(null);

      const payload: SampleSkuOnboardingPayload = {
        pedido_detalle_id: line.id,
        ...(requiresColor ? { color: parsed.data.color } : {}),
        materia_prima_detalle: parsed.data.materia_prima_detalle,
      };

      try {
        await createOnboarding(payload);
        onSuccess();
      } catch {
        // El error ya se repartió en `onServerError` y el toast lo emite la mutación.
      }
    },
  });

  const getError = (path: string): FormFieldError | undefined =>
    errors[path] ? { message: errors[path] } : undefined;

  const clearError = (path: string) => {
    setErrors((prev) => {
      if (!(path in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  /** Valida el color antes de avanzar del Paso 1. `true` si se puede continuar. */
  const validateColor = (): boolean => {
    if (!requiresColor || form.getFieldValue("color") > 0) return true;
    setErrors((prev) => ({ ...prev, color: "Selecciona el color de la línea" }));
    return false;
  };

  /**
   * Fija los materiales elegidos en el Paso 1. Los que siguen seleccionados
   * CONSERVAN lo ya capturado; los nuevos entran con los defaults. Se limpian
   * los errores: los índices por renglón dejan de corresponder, y el color ya
   * se validó para llegar aquí.
   */
  const setMaterials = (componentIds: number[]) => {
    const current = form.getFieldValue("materia_prima_detalle");
    form.setFieldValue(
      "materia_prima_detalle",
      componentIds.map(
        (componente) =>
          current.find((row) => row.componente === componente) ?? newMaterialRow(componente),
      ),
    );
    setErrors({});
    setFormError(null);
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return {
    form,
    requiresColor,
    isSubmitting: isPending,
    formError,
    getError,
    clearError,
    validateColor,
    setMaterials,
    handleFormSubmit,
  };
}

export type SampleSkuOnboardingForm = ReturnType<typeof useSampleSkuOnboardingForm>;
