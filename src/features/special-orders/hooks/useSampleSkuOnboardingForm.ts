"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useColors } from "@/src/features/colors/hooks/useColors";
import type { FormFieldError } from "@/src/utils/getFieldError";
import type {
  SampleProductionVariant,
  SampleSkuOnboardingPayload,
  SpecialOrderLine,
} from "../interfaces/special-order.interface";
import {
  buildSampleSkuOnboardingSchema,
  type SampleSkuOnboardingFormValues,
  type SampleSkuOnboardingMaterialFormValues,
} from "../schemas/sample-sku-onboarding.schema";
import { getCatalogAltaBlockReason } from "../utils/catalogAlta";
import { type ChosenSampleColor, getSampleSkuPreview } from "../utils/sampleSkuPreview";
import { useCreateSampleSkuOnboarding } from "./useCreateSampleSkuOnboarding";

interface UseSampleSkuOnboardingFormParams {
  pedidoId: number;
  line: SpecialOrderLine;
  /** Tras un alta exitosa, con lo que creó el backend: el asistente muestra el resultado. */
  onSuccess: (variants: SampleProductionVariant[]) => void;
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

  // El color elegido solo cuenta en una línea sin color; `useColors` comparte
  // caché con el selector del Paso 1. Elegido pero sin datos del catálogo
  // (cargando o ausente) NO equivale a "sin elegir".
  const { colors, isLoading: isLoadingColors } = useColors();
  const resolveChosenColor = (colorId: number): ChosenSampleColor => {
    if (!requiresColor || colorId <= 0) return null;
    const color = colors.find((option) => option.id === colorId);
    if (color) return { codigo: color.codigo };
    return isLoadingColors ? "loading" : "unavailable";
  };

  const form = useForm({
    defaultValues: {
      color: 0,
      materia_prima_detalle: [],
      alta_catalogo: false,
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

      // Se recalcula con lo que se envía (no con valores del render): un color
      // sin código, o cuyo código aún no se conoce, haría fallar el alta.
      const { blocker } = getSampleSkuPreview(line, resolveChosenColor(parsed.data.color));
      if (blocker) {
        setErrors({});
        setFormError(blocker);
        return;
      }

      setErrors({});
      setFormError(null);

      const payload: SampleSkuOnboardingPayload = {
        pedido_detalle_id: line.id,
        ...(requiresColor ? { color: parsed.data.color } : {}),
        materia_prima_detalle: parsed.data.materia_prima_detalle,
        // Solo `true` y solo si la línea lo admite AHORA: un refetch pudo traer
        // SKU generados en otra sesión después de marcar la casilla.
        ...(parsed.data.alta_catalogo && getCatalogAltaBlockReason(line) === null
          ? { alta_catalogo: true }
          : {}),
      };

      try {
        onSuccess(await createOnboarding(payload));
      } catch {
        // El error ya se repartió en `onServerError` y el toast lo emite la mutación.
      }
    },
  });

  // Vista previa del SKU por talla para el render (el envío la recalcula).
  const chosenColorId = useStore(form.store, (state) => state.values.color);
  const skuPreview = getSampleSkuPreview(line, resolveChosenColor(chosenColorId));
  const catalogBlockReason = getCatalogAltaBlockReason(line);

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
    skuPreview,
    catalogBlockReason,
    catalogCategoryId: line.categoria_producto?.id ?? null,
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
