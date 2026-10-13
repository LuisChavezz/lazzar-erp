"use client";

import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { TIPO_SEGUIMIENTO_DEFAULT } from "../constants/seguimientoChoices";
import type {
  OpportunitySeguimiento,
  SeguimientoCreate,
  SeguimientoPatch,
} from "../interfaces/seguimiento.interface";
import {
  SeguimientoFormFields,
  SeguimientoFormSchema,
  type SeguimientoFormValues,
} from "../schemas/seguimiento.schema";
import { isOpportunityRejectedError } from "./seguimientoErrorMessages";
import { useCreateSeguimiento, useUpdateSeguimiento } from "./useSeguimientoMutations";

interface UseSeguimientoFormParams {
  /** Oportunidad a la que pertenece el seguimiento. */
  opportunityId: number;
  /**
   * La oportunidad está cerrada (Perdida/Ganada): sus seguimientos no generan
   * recordatorios, así que la fecha no se captura ni se envía.
   */
  isOpportunityClosed: boolean;
  seguimientoToEdit: OpportunitySeguimiento | null;
  onSuccess: () => void;
}

type SeguimientoFormField = keyof SeguimientoFormValues;
type FieldErrors = Partial<Record<SeguimientoFormField, string>>;

const EMPTY_VALUES: SeguimientoFormValues = {
  tipo: TIPO_SEGUIMIENTO_DEFAULT,
  detalle: "",
  fecha_recordatorio: "",
};

const toFormValues = (seguimiento: OpportunitySeguimiento): SeguimientoFormValues => ({
  tipo: seguimiento.tipo,
  detalle: seguimiento.detalle ?? "",
  fecha_recordatorio: seguimiento.fecha_recordatorio ?? "",
});

/**
 * Alta y edición de un seguimiento (mismo formulario).
 *
 * - Alta: `completado` nunca se envía (nace pendiente) y el autor lo pone el
 *   backend.
 * - Edición: PATCH con SOLO lo que cambió respecto a como se abrió, para no
 *   pisar lo que otra persona haya editado entretanto. `oportunidad` nunca
 *   viaja.
 * - Con la oportunidad cerrada, `fecha_recordatorio` no se envía: en un alta
 *   queda sin fecha, y en una edición el backend conserva la que tuviera.
 */
export function useSeguimientoForm({
  opportunityId,
  isOpportunityClosed,
  seguimientoToEdit,
  onSuccess,
}: UseSeguimientoFormParams) {
  const isEditing = seguimientoToEdit !== null;
  // Envío en curso, síncrono (ver `onSubmit`).
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Errores por campo (de cliente y de servidor): ver `useFormFieldErrors`.
  const {
    getError,
    setServerFieldError,
    setClientFieldError,
    clearClientFieldError,
    clearFieldErrors,
    replaceClientErrors,
    clearServerErrors,
    clearAllErrors,
  } = useFormFieldErrors<SeguimientoFormField>();

  const { mutateAsync: createSeguimiento, isPending: isCreating } =
    useCreateSeguimiento(setServerFieldError);
  const { mutateAsync: updateSeguimiento, isPending: isUpdating } =
    useUpdateSeguimiento(setServerFieldError);

  // Valida un solo campo en blur.
  const validateField = (field: SeguimientoFormField, value: string) => {
    const parsed = SeguimientoFormFields[field].safeParse(value);
    if (parsed.success) {
      clearClientFieldError(field);
      return;
    }
    setClientFieldError(field, parsed.error.issues[0]?.message ?? "Valor inválido");
  };

  /** El envío en sí, sin la guarda de doble envío (vive en `onSubmit`). */
  const submitSeguimiento = async (value: SeguimientoFormValues) => {
    clearServerErrors();

    const parsed = SeguimientoFormSchema.safeParse(value);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as SeguimientoFormField;
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      });
      replaceClientErrors(nextErrors);
      return;
    }
    replaceClientErrors({});

    // `detalle` ya viene recortado por el schema.
    const { tipo, detalle } = parsed.data;
    const fechaRecordatorio = parsed.data.fecha_recordatorio || null;

    setIsSubmitting(true);
    try {
      if (seguimientoToEdit) {
        const changes: SeguimientoPatch = {};
        if (tipo !== seguimientoToEdit.tipo) changes.tipo = tipo;
        if (detalle !== seguimientoToEdit.detalle) changes.detalle = detalle;
        if (!isOpportunityClosed && fechaRecordatorio !== seguimientoToEdit.fecha_recordatorio) {
          changes.fecha_recordatorio = fechaRecordatorio;
        }
        if (Object.keys(changes).length === 0) {
          toast("No hay cambios que guardar.");
          onSuccess();
          return;
        }
        await updateSeguimiento({ id: seguimientoToEdit.id, changes });
      } else {
        const payload: SeguimientoCreate = { oportunidad: opportunityId, tipo, detalle };
        if (!isOpportunityClosed) payload.fecha_recordatorio = fechaRecordatorio;
        await createSeguimiento(payload);
      }
      onSuccess();
    } catch (error) {
      // El `onError` de la mutación ya avisó y pintó los errores por campo. Sin
      // este catch el rechazo de `mutateAsync` escaparía sin manejar.
      //
      // Si el seguimiento ya no existe (otra persona lo eliminó), no hay nada
      // que reintentar: el diálogo se cierra y queda el historial, que la
      // mutación ya refrescó. Lo mismo en un alta cuya OPORTUNIDAD ya no
      // existe: la relectura deja la ficha en "no disponible".
      const isGone = seguimientoToEdit
        ? isNotFoundError(error)
        : isOpportunityRejectedError(error);
      if (isGone) onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  const form = useForm({
    defaultValues: seguimientoToEdit ? toFormValues(seguimientoToEdit) : EMPTY_VALUES,
    onSubmit: async ({ value }) => {
      // Guarda SÍNCRONA contra el doble envío en el mismo tick: `isPending`
      // deshabilita el formulario hasta el siguiente render.
      if (submittingRef.current) return;
      submittingRef.current = true;
      try {
        await submitSeguimiento(value);
      } finally {
        submittingRef.current = false;
      }
    },
  });

  const handleReset = () => {
    form.reset(seguimientoToEdit ? toFormValues(seguimientoToEdit) : EMPTY_VALUES);
    clearAllErrors();
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return {
    form,
    isPending: isCreating || isUpdating || isSubmitting,
    isEditing,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
