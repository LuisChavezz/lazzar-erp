"use client";

import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import type {
  RecalculateConsumptionBody,
  RecalculateConsumptionResponse,
} from "../interfaces/production-order-consumption.interface";
import {
  RecalculateConsumptionFields,
  recalculateConsumptionSchema,
  type RecalculateConsumptionField,
  type RecalculateConsumptionValues,
} from "../schemas/recalculate-consumption.schema";
import { handleRecalculateConsumptionError } from "./recalculateConsumptionErrorMessages";
import { useRecalculateProductionOrderConsumption } from "./useRecalculateProductionOrderConsumption";

/** Paso del diálogo: captura → confirmación → resultado. */
export type RecalculateConsumptionStep = "form" | "confirm" | "result";

interface UseRecalculateConsumptionFormParams {
  opId: number;
  /** `cantidad_real_corte` de la ruta crítica, ya como texto del input ("" si no hay). */
  initialCantidad: string;
}

/**
 * Formulario del recálculo de consumos, en tres pasos:
 *
 * 1. **Captura** (`form`): cantidad real de corte y productos. "Continuar"
 *    valida con Zod y NO envía nada.
 * 2. **Confirmación** (`confirm`): el cuerpo ya validado queda fijo; confirmar
 *    dispara el POST, que mueve inventario y no tiene vista previa.
 * 3. **Resultado** (`result`): la respuesta del servidor, tal cual.
 *
 * Un error en el POST regresa a la captura con lo tecleado intacto: los
 * errores de `cantidad_real_corte` / `productos` quedan bajo su campo y el
 * resto (`permiso`, `op`, `inventario`, 404, red) en `formMessage`.
 */
export function useRecalculateConsumptionForm({
  opId,
  initialCantidad,
}: UseRecalculateConsumptionFormParams) {
  const [step, setStep] = useState<RecalculateConsumptionStep>("form");
  const [confirmedBody, setConfirmedBody] = useState<RecalculateConsumptionBody | null>(null);
  const [result, setResult] = useState<RecalculateConsumptionResponse | null>(null);
  const [formMessage, setFormMessage] = useState<string | undefined>(undefined);
  // Envío en curso, síncrono: `isPending` llega hasta el siguiente render y el
  // POST no es idempotente en efectos (mueve inventario).
  const submittingRef = useRef(false);

  const {
    getError,
    setServerFieldError,
    setClientFieldError,
    clearClientFieldError,
    clearFieldErrors,
    replaceClientErrors,
    clearServerErrors,
  } = useFormFieldErrors<RecalculateConsumptionField>();

  const { mutateAsync, isPending } = useRecalculateProductionOrderConsumption(opId);

  /** Valida UN campo (blur del input, o cambio en la lista de productos). */
  const validateField = <F extends RecalculateConsumptionField>(
    field: F,
    value: RecalculateConsumptionValues[F],
  ) => {
    const parsed = RecalculateConsumptionFields[field].safeParse(value);
    if (parsed.success) {
      clearClientFieldError(field);
      return;
    }
    setClientFieldError(field, parsed.error.issues[0]?.message ?? "Valor inválido");
  };

  const form = useForm({
    defaultValues: {
      cantidad_real_corte: initialCantidad,
      productos: [],
    } as RecalculateConsumptionValues,
    onSubmit: ({ value }) => {
      const parsed = recalculateConsumptionSchema.safeParse(value);
      if (!parsed.success) {
        const next: Partial<Record<RecalculateConsumptionField, string>> = {};
        parsed.error.issues.forEach((issue) => {
          const field = issue.path[0] as RecalculateConsumptionField;
          if (field) next[field] ??= issue.message;
        });
        replaceClientErrors(next);
        return;
      }
      replaceClientErrors({});
      setConfirmedBody(parsed.data);
      setStep("confirm");
    },
  });

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  /** "Volver" desde la confirmación: lo capturado sigue ahí. */
  const backToForm = () => {
    if (isPending) return;
    setStep("form");
  };

  /** Confirmación: el único punto que dispara el POST. */
  const confirm = async () => {
    if (!confirmedBody || submittingRef.current) return;
    submittingRef.current = true;
    clearServerErrors();
    setFormMessage(undefined);
    try {
      const response = await mutateAsync(confirmedBody);
      setResult(response);
      setStep("result");
    } catch (error) {
      setFormMessage(handleRecalculateConsumptionError(error, setServerFieldError));
      setStep("form");
    } finally {
      submittingRef.current = false;
    }
  };

  return {
    form,
    step,
    confirmedBody,
    result,
    formMessage,
    isPending,
    getError,
    clearFieldErrors,
    validateField,
    handleFormSubmit,
    backToForm,
    confirm,
  };
}
