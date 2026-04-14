"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { UpcomingTaskFormSchema, type UpcomingTaskFormValues } from "../schemas/upcoming-task.schema";
import { useUpcomingTasksStore } from "../stores/upcoming-tasks.store";
import type { UpcomingTask } from "../interfaces/upcoming-task.interface";

interface UseUpcomingTaskFormParams {
  onSuccess: () => void;
  taskToEdit?: UpcomingTask | null;
  defaultCalendarDate?: Date | null;
  dialogOpen?: boolean;
}

type UpcomingTaskField = keyof UpcomingTaskFormValues;

// Formatea un Date a YYYY-MM-DD usando la hora local del navegador.
const dateToInputDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Formatea un Date a HH:MM usando la hora local del navegador.
const dateToInputTime = (date: Date): string => {
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
};

// Extrae la parte YYYY-MM-DD de una ISO con offset (-06:00).
// Los primeros 10 caracteres son siempre la fecha en la zona del offset almacenado.
const isoToDatePart = (iso: string): string => {
  if (!iso) return "";
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
};

// Extrae la parte HH:MM de una ISO con offset (-06:00).
const isoToTimePart = (iso: string): string => {
  if (!iso) return "";
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "";
};

// Construye ISO de inicio de día en GMT-6: YYYY-MM-DDT00:00:00-06:00.
const toStartOfDayIso = (date: string): string => `${date}T00:00:00-06:00`;

// Construye ISO de fin de día en GMT-6: YYYY-MM-DDT23:59:59-06:00.
const toEndOfDayIso = (date: string): string => `${date}T23:59:59-06:00`;

// Construye ISO de una fecha+hora en GMT-6: YYYY-MM-DDTHH:MM:00-06:00.
const toTimedIso = (date: string, time: string): string => `${date}T${time}:00-06:00`;

const buildEmptyValues = (defaultCalendarDate?: Date | null): UpcomingTaskFormValues => {
  const now = new Date();
  const baseDate = defaultCalendarDate ?? now;
  const startTime = dateToInputTime(now);
  const endTime = dateToInputTime(new Date(now.getTime() + 60 * 60 * 1000));
  return {
    title: "",
    shortDescription: "",
    comments: "",
    allDay: false,
    startDate: "",
    endDate: "",
    date: dateToInputDate(baseDate),
    startTime,
    endTime,
  };
};

export function useUpcomingTaskForm({
  onSuccess,
  taskToEdit,
  defaultCalendarDate,
  dialogOpen = false,
}: UseUpcomingTaskFormParams) {
  const addTask = useUpcomingTasksStore((state) => state.addTask);
  const updateTask = useUpcomingTasksStore((state) => state.updateTask);

  const isEditing = Boolean(taskToEdit?.id);

  const emptyValues = useMemo(
    () => buildEmptyValues(defaultCalendarDate),
    [defaultCalendarDate]
  );

  // Hidrata el formulario con los valores persistidos de la tarea a editar.
  const editValues: UpcomingTaskFormValues = useMemo(() => {
    if (!taskToEdit) return emptyValues;
    if (taskToEdit.allDay) {
      return {
        title: taskToEdit.title,
        shortDescription: taskToEdit.shortDescription,
        comments: taskToEdit.comments ?? "",
        allDay: true,
        startDate: isoToDatePart(taskToEdit.startDate),
        endDate: isoToDatePart(taskToEdit.endDate),
        date: "",
        startTime: "",
        endTime: "",
      };
    }
    return {
      title: taskToEdit.title,
      shortDescription: taskToEdit.shortDescription,
      comments: taskToEdit.comments ?? "",
      allDay: false,
      startDate: "",
      endDate: "",
      date: isoToDatePart(taskToEdit.startDate),
      startTime: isoToTimePart(taskToEdit.startDate),
      endTime: isoToTimePart(taskToEdit.endDate),
    };
  }, [emptyValues, taskToEdit]);

  const [errors, setErrors] = useState<Partial<Record<UpcomingTaskField, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getError = (field: UpcomingTaskField): FormFieldError | undefined => {
    const message = errors[field];
    return message ? { message } : undefined;
  };

  const clearFieldError = (field: UpcomingTaskField) => {
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateForm = (values: UpcomingTaskFormValues) => {
    const parsed = UpcomingTaskFormSchema.safeParse(values);
    if (parsed.success) {
      setErrors({});
      return true;
    }
    const nextErrors: Partial<Record<UpcomingTaskField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as UpcomingTaskField;
      if (!field || nextErrors[field]) return;
      nextErrors[field] = issue.message;
    });
    setErrors(nextErrors);
    return false;
  };

  const form = useForm({
    defaultValues: emptyValues,
    onSubmit: async ({ value }) => {
      if (!validateForm(value)) return;

      // Construye el payload con las ISO correctas según el modo del evento.
      const payload = value.allDay
        ? {
            title: value.title.trim(),
            shortDescription: value.shortDescription.trim(),
            comments: value.comments?.trim() || undefined,
            allDay: true as const,
            startDate: toStartOfDayIso(value.startDate),
            endDate: toEndOfDayIso(value.endDate),
          }
        : {
            title: value.title.trim(),
            shortDescription: value.shortDescription.trim(),
            comments: value.comments?.trim() || undefined,
            allDay: false as const,
            startDate: toTimedIso(value.date, value.startTime),
            endDate: toTimedIso(value.date, value.endTime),
          };

      if (isEditing && taskToEdit) {
        updateTask({ id: taskToEdit.id, ...payload });
        form.reset(editValues);
        onSuccess();
        return;
      }

      addTask(payload);
      form.reset(emptyValues);
      onSuccess();
    },
  });

  // Alterna entre modo todo-el-día y modo con hora, convirtiendo los valores actuales.
  const handleAllDayToggle = (nextAllDay: boolean) => {
    const values = form.state.values;
    form.setFieldValue("allDay", nextAllDay);

    if (nextAllDay) {
      // Toma la fecha seleccionada en modo hora como punto de partida.
      const dateStr = values.date || dateToInputDate(new Date());
      form.setFieldValue("startDate", dateStr);
      form.setFieldValue("endDate", dateStr);
      form.setFieldValue("date", "");
      form.setFieldValue("startTime", "");
      form.setFieldValue("endTime", "");
    } else {
      // Toma la fecha de inicio del modo todo-el-día como punto de partida.
      const dateStr = values.startDate || dateToInputDate(new Date());
      const now = new Date();
      form.setFieldValue("date", dateStr);
      form.setFieldValue("startTime", dateToInputTime(now));
      form.setFieldValue("endTime", dateToInputTime(new Date(now.getTime() + 3600000)));
      form.setFieldValue("startDate", "");
      form.setFieldValue("endDate", "");
    }

    // Limpia errores de todos los campos de fecha/hora al cambiar de modo.
    setErrors((prev) => {
      const next = { ...prev };
      delete next.startDate;
      delete next.endDate;
      delete next.date;
      delete next.startTime;
      delete next.endTime;
      return next;
    });
  };

  useEffect(() => {
    if (!isEditing) return;
    form.reset(editValues);
    setErrors({});
  }, [editValues, form, isEditing]);

  useEffect(() => {
    if (isEditing || !dialogOpen) return;
    form.reset(emptyValues);
    setErrors({});
  }, [dialogOpen, emptyValues, form, isEditing]);

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await Promise.resolve(form.handleSubmit());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    form.reset(isEditing ? editValues : emptyValues);
    setErrors({});
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const isPending = isSubmitting || form.state.isSubmitting;

  return {
    form,
    isPending,
    isEditing,
    getError,
    clearFieldError,
    handleFormSubmit,
    handleClear,
    handleAllDayToggle,
  };
}
