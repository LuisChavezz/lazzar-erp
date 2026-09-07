"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useShifts } from "@/src/features/shifts/hooks/useShifts";
import { CalendarFormSchema, CalendarFormValues } from "../schemas/calendar.schema";
import { useCreateCalendar } from "./useCreateCalendar";
import { useUpdateCalendar } from "./useUpdateCalendar";
import { Calendar } from "../interfaces/calendar.interface";

interface UseCalendarFormParams {
  onSuccess: () => void;
  calendarToEdit?: Calendar | null;
}

type CalendarFormField = keyof CalendarFormValues;

export function useCalendarForm({ onSuccess, calendarToEdit }: UseCalendarFormParams) {
  // Determina modo creación/edición para mantener el flujo existente.
  const isEditing = Boolean(calendarToEdit?.id);

  // No se lee el workspace: `empresa` nunca viaja, el backend la resuelve desde
  // `turno`. Ver `CalendarCreate`.

  // Catálogo de turnos que alimenta el select del FK obligatorio.
  const { shifts, isLoading: isLoadingShifts } = useShifts();

  // Conserva referencia al form para scroll superior suave al limpiar.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Mantiene estado local de envío para bloquear controles durante submit.
  const [isLoading, setIsLoading] = useState(false);

  // Separa errores de validación cliente y servidor para cada campo.
  const [clientErrors, setClientErrors] = useState<Partial<Record<CalendarFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<CalendarFormField, string>>>({});

  // Define valores vacíos del formulario. `turno: 0` es el centinela de
  // "Seleccionar..." y el schema lo rechaza mientras siga así.
  const emptyValues = useMemo<CalendarFormValues>(
    () => ({
      fecha: "",
      tipo: "",
      turno: 0,
    }),
    []
  );

  // Deriva valores de edición.
  const editValues = useMemo<CalendarFormValues>(
    () =>
      calendarToEdit
        ? {
            fecha: calendarToEdit.fecha,
            tipo: calendarToEdit.tipo ?? "",
            turno: calendarToEdit.turno,
          }
        : emptyValues,
    [emptyValues, calendarToEdit]
  );

  // Recibe errores de mutaciones y los asigna al estado de servidor.
  const setHookError = (field: CalendarFormField, error: { message?: string }) => {
    if (!error.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createCalendar, isPending: isCreating } = useCreateCalendar(setHookError);
  const { mutateAsync: updateCalendar, isPending: isUpdating } = useUpdateCalendar(setHookError);

  // Limpia errores del campo cuando cambia su valor.
  const clearFieldErrors = (field: CalendarFormField) => {
    setClientErrors((prev) => {
      if (!(field in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setServerErrors((prev) => {
      if (!(field in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Valida un solo campo en blur.
  const validateField = (field: CalendarFormField, value: CalendarFormValues[CalendarFormField]) => {
    const fieldSchema = CalendarFormSchema.shape[field];
    const parsed = fieldSchema.safeParse(value);

    if (parsed.success) {
      setClientErrors((prev) => {
        if (!(field in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[field];
        return next;
      });
      return true;
    }

    const message = parsed.error.issues[0]?.message ?? "Valor inválido";
    setClientErrors((prev) => ({ ...prev, [field]: message }));
    return false;
  };

  // Valida todo el formulario antes de mutar.
  const validateForm = (values: CalendarFormValues) => {
    const parsed = CalendarFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<CalendarFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as CalendarFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setClientErrors(nextErrors);
    return false;
  };

  // Entrega error compatible con componentes visuales actuales.
  const getError = (field: CalendarFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  // Controla submit con la misma lógica original.
  const form = useForm({
    defaultValues: isEditing ? editValues : emptyValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      if (!validateForm(value)) {
        return;
      }

      setIsLoading(true);
      try {
        // El cuerpo es el formulario tal cual: no hay `empresa` que resolver ni
        // opcionales que convertir a null (`tipo` vacío viaja como "").
        const payload = {
          fecha: value.fecha,
          tipo: value.tipo,
          turno: value.turno,
        };

        if (isEditing && calendarToEdit) {
          await updateCalendar({ id: calendarToEdit.id, ...payload });
        } else {
          await createCalendar(payload);
        }

        onSuccess();
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Mantiene a mano los últimos valores de edición SIN que su identidad sea
  // una dependencia del efecto de abajo. Va declarado antes para que React lo
  // ejecute primero cuando ambos efectos caen en el mismo commit.
  const editValuesRef = useRef(editValues);
  useEffect(() => {
    editValuesRef.current = editValues;
  }, [editValues]);

  /**
   * Repuebla el formulario cuando cambia LA ENTIDAD en edición, identificada
   * por su `id` y no por la identidad del objeto: `editValues` se rederiva cada
   * vez que `calendarToEdit` es un objeto nuevo, y bastaría con que alguien
   * pasara una fila viva de `useCalendars` para que un refetch en segundo plano
   * borrara lo que el usuario llevaba escrito.
   */
  const editedCalendarId = calendarToEdit?.id ?? null;
  useEffect(() => {
    form.reset(editedCalendarId ? editValuesRef.current : emptyValues);
  }, [editedCalendarId, emptyValues, form]);

  // Expone estado combinado de carga/mutación.
  const isPending = isCreating || isUpdating || isLoading;

  // Limpia estado y hace scroll superior suave.
  const handleReset = () => {
    const nextValues = isEditing ? editValues : emptyValues;
    form.reset(nextValues);
    setClientErrors({});
    setServerErrors({});
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  // Encapsula submit del form y delega en TanStack Form.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  // Mantiene key estable para remount entre crear y editar.
  const formKey = isEditing ? `calendar-edit-${calendarToEdit?.id ?? "ready"}` : "calendar-new";

  return {
    form,
    formRef,
    formKey,
    isPending,
    isEditing,
    shifts,
    isLoadingShifts,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
