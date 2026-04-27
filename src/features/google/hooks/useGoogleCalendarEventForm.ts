"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import {
  GoogleCalendarEventSchema,
  type GoogleCalendarEventFormValues,
} from "../schemas/google-calendar.schema";
import { useCreateGoogleCalendarEvent } from "./useCreateGoogleCalendarEvent";

// --- Tipos ---

interface UseGoogleCalendarEventFormParams {
  /** Callback invocado tras la creación exitosa del evento. */
  onSuccess: () => void;
  /** Fecha inicial (YYYY-MM-DD) preseleccionada desde el clic en el calendario. */
  initialDate?: string;
}

type EventFormField = keyof GoogleCalendarEventFormValues;

// --- Utilidades de fecha/hora ---

const getTodayDate = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getCurrentTime = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

const getTimeInOneHour = (): string => {
  const future = new Date(Date.now() + 60 * 60 * 1000);
  return `${String(future.getHours()).padStart(2, "0")}:${String(future.getMinutes()).padStart(2, "0")}`;
};

// --- Valores iniciales ---

const buildEmptyValues = (initialDate?: string): GoogleCalendarEventFormValues => ({
  summary: "",
  description: "",
  allDay: false,
  start_date: initialDate ?? getTodayDate(),
  end_date: "",
  start_time: getCurrentTime(),
  end_time: getTimeInOneHour(),
});

// --- Hook ---

/**
 * Controla el estado del formulario para crear un evento de Google Calendar.
 *
 * Sigue el mismo patrón que los formularios existentes del proyecto:
 * - `clientErrors` para errores de validación Zod en cliente.
 * - `validateForm` para validar el formulario completo en submit.
 * - `getError` combina errores para un campo dado.
 * - `form` instancia de TanStack Form que gestiona el estado y el submit.
 */
export function useGoogleCalendarEventForm({ onSuccess, initialDate }: UseGoogleCalendarEventFormParams) {
  const [clientErrors, setClientErrors] = useState<Partial<Record<EventFormField, string>>>({});
  const { mutateAsync: createEvent, isPending } = useCreateGoogleCalendarEvent();

  // --- Limpia el error de un campo al editar ---
  const clearFieldError = (field: EventFormField) => {
    setClientErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // --- Valida el formulario completo en submit ---
  const validateForm = (values: GoogleCalendarEventFormValues): boolean => {
    const parsed = GoogleCalendarEventSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }
    const nextErrors: Partial<Record<EventFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as EventFormField;
      if (!field || nextErrors[field]) return;
      nextErrors[field] = issue.message;
    });
    setClientErrors(nextErrors);
    return false;
  };

  // --- Obtiene el error combinado de un campo ---
  const getError = (field: EventFormField): FormFieldError | undefined => {
    const message = clientErrors[field];
    return message ? { message } : undefined;
  };

  // --- Instancia de TanStack Form ---
  const form = useForm({
    defaultValues: buildEmptyValues(initialDate),
    onSubmit: async ({ value }) => {
      if (!validateForm(value)) return;

      // Construye el payload según el modo del evento (todo el día o con hora).
      const payload = value.allDay
        ? {
            summary: value.summary.trim(),
            description: value.description?.trim() || undefined,
            start_date: value.start_date,
            end_date: value.end_date || undefined,
          }
        : {
            summary: value.summary.trim(),
            description: value.description?.trim() || undefined,
            start_date: value.start_date,
            start_time: value.start_time,
            end_date: value.end_date || undefined,
            end_time: value.end_time || undefined,
          };

      try {
        await createEvent(payload);
        form.reset(buildEmptyValues(initialDate));
        setClientErrors({});
        onSuccess();
      } catch {
        // El error ya se notifica vía toast en useCreateGoogleCalendarEvent.
        return;
      }
    },
  });

  // --- Alterna entre modo todo-el-día y modo con hora ---
  const handleAllDayToggle = (nextAllDay: boolean) => {
    const values = form.state.values;
    form.setFieldValue("allDay", nextAllDay);

    if (nextAllDay) {
      // Limpia los campos de hora al pasar a modo todo el día.
      form.setFieldValue("start_time", "");
      form.setFieldValue("end_time", "");
    } else {
      // Restaura valores de hora al volver a modo con hora.
      form.setFieldValue("start_time", values.start_time || getCurrentTime());
      form.setFieldValue("end_time", values.end_time || getTimeInOneHour());
    }

    // Limpia errores de campos de tiempo al cambiar de modo.
    setClientErrors((prev) => {
      const next = { ...prev };
      delete next.start_time;
      delete next.end_time;
      return next;
    });
  };

  // --- Limpia el formulario y los errores ---
  const handleReset = () => {
    form.reset(buildEmptyValues(initialDate));
    setClientErrors({});
  };

  // --- Wrapper de submit para el evento DOM del formulario ---
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    form.handleSubmit();
  };

  return {
    form,
    isPending,
    getError,
    clearFieldError,
    handleAllDayToggle,
    handleReset,
    handleFormSubmit,
  };
}
