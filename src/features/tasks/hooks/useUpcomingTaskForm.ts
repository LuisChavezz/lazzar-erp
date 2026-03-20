"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { normalizeDate } from "@/src/utils/normalizeDate";
import { toInputDateTime } from "@/src/utils/toInputDateTime";
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

const buildDefaultDueDate = (defaultCalendarDate: Date | null | undefined) => {
  const now = new Date();
  if (defaultCalendarDate) {
    const calendarDateWithCurrentHour = new Date(defaultCalendarDate);
    calendarDateWithCurrentHour.setHours(now.getHours(), now.getMinutes(), 0, 0);
    return toInputDateTime(calendarDateWithCurrentHour.toISOString());
  }
  return toInputDateTime(now.toISOString());
};

export function useUpcomingTaskForm({
  onSuccess,
  taskToEdit,
  defaultCalendarDate,
  dialogOpen = false,
}: UseUpcomingTaskFormParams) {
  // Conecta acciones del store para crear y actualizar tareas.
  const addTask = useUpcomingTasksStore((state) => state.addTask);
  const updateTask = useUpcomingTasksStore((state) => state.updateTask);

  // Determina modo edición para conservar el flujo original de submit y reset.
  const isEditing = Boolean(taskToEdit?.id);
  const currentDateTime = useMemo(() => buildDefaultDueDate(defaultCalendarDate), [defaultCalendarDate]);
  const emptyValues: UpcomingTaskFormValues = useMemo(
    () => ({
      title: "",
      shortDescription: "",
      comments: "",
      dueDate: currentDateTime,
    }),
    [currentDateTime]
  );

  // Calcula valores de edición para hidratar el formulario cuando existe una tarea.
  const editValues: UpcomingTaskFormValues = useMemo(
    () =>
      taskToEdit
        ? {
            title: taskToEdit.title,
            shortDescription: taskToEdit.shortDescription,
            comments: taskToEdit.comments ?? "",
            dueDate: toInputDateTime(taskToEdit.dueDate),
          }
        : emptyValues,
    [emptyValues, taskToEdit]
  );

  // Mantiene errores por campo para mapearlos al contrato de FormInput/FormTextarea.
  const [errors, setErrors] = useState<Partial<Record<UpcomingTaskField, string>>>({});

  // Controla el estado de envío para bloquear doble submit.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expone error de campo compatible con los componentes de formulario del proyecto.
  const getError = (field: UpcomingTaskField): FormFieldError | undefined => {
    const message = errors[field];
    return message ? { message } : undefined;
  };

  // Limpia error puntual cuando el usuario corrige un campo.
  const clearFieldError = (field: UpcomingTaskField) => {
    setErrors((prev) => {
      if (!(field in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Ejecuta validación Zod completa y genera errores por campo.
  const validateForm = (values: UpcomingTaskFormValues) => {
    const parsed = UpcomingTaskFormSchema.safeParse(values);
    if (parsed.success) {
      setErrors({});
      return true;
    }

    const nextErrors: Partial<Record<UpcomingTaskField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as UpcomingTaskField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setErrors(nextErrors);
    return false;
  };

  // Inicializa TanStack Form y centraliza el flujo de guardar/actualizar.
  const form = useForm({
    defaultValues: emptyValues,
    onSubmit: async ({ value }) => {
      if (!validateForm(value)) {
        return;
      }

      const payload = {
        title: value.title.trim(),
        shortDescription: value.shortDescription.trim(),
        comments: value.comments?.trim() || undefined,
        dueDate: normalizeDate(value.dueDate),
      };

      if (isEditing && taskToEdit) {
        updateTask({
          id: taskToEdit.id,
          ...payload,
        });
        form.reset(editValues);
        onSuccess();
        return;
      }

      addTask(payload);
      form.reset(emptyValues);
      onSuccess();
    },
  });

  // Replica sincronización de modo edición cuando cambia la tarea seleccionada.
  useEffect(() => {
    if (!isEditing) {
      return;
    }
    form.reset(editValues);
    setErrors({});
  }, [editValues, form, isEditing]);

  // Replica limpieza al abrir diálogo en modo creación.
  useEffect(() => {
    if (isEditing || !dialogOpen) {
      return;
    }
    form.reset(emptyValues);
    setErrors({});
  }, [dialogOpen, emptyValues, form, isEditing]);

  // Encapsula submit DOM para delegarlo en TanStack Form.
  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await Promise.resolve(form.handleSubmit());
    } finally {
      setIsSubmitting(false);
    }
  };

  // Limpia formulario según contexto y desplaza la vista al inicio suavemente.
  const handleClear = () => {
    form.reset(isEditing ? editValues : emptyValues);
    setErrors({});
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Estado de bloqueo visual para controles y botón submit.
  const isPending = isSubmitting || form.state.isSubmitting;

  // Contrato público del hook para mantener el componente enfocado en presentación.
  return {
    form,
    isPending,
    isEditing,
    getError,
    clearFieldError,
    handleFormSubmit,
    handleClear,
  };
}
