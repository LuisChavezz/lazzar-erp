"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useDepartments } from "@/src/features/departments/hooks/useDepartments";
import { AreaFormSchema, AreaFormValues } from "../schemas/area.schema";
import { useCreateArea } from "./useCreateArea";
import { useUpdateArea } from "./useUpdateArea";
import { Area } from "../interfaces/area.interface";

interface UseAreaFormParams {
  onSuccess: () => void;
  areaToEdit?: Area | null;
}

type AreaFormField = keyof AreaFormValues;

export function useAreaForm({ onSuccess, areaToEdit }: UseAreaFormParams) {
  // Determina modo creación/edición para mantener el flujo existente.
  const isEditing = Boolean(areaToEdit?.id);

  // Catálogo de departamentos que alimenta el select del FK.
  const { departments, isLoading: isLoadingDepartments } = useDepartments();

  // Conserva referencia al form para scroll superior suave al limpiar.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Mantiene estado local de envío para bloquear controles durante submit.
  const [isLoading, setIsLoading] = useState(false);

  // Separa errores de validación cliente y servidor para cada campo.
  const [clientErrors, setClientErrors] = useState<Partial<Record<AreaFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<AreaFormField, string>>>({});

  // Define valores vacíos del formulario. `departamento: 0` es el centinela
  // de la opción "Seleccionar..." y el schema lo rechaza como inválido.
  const emptyValues = useMemo<AreaFormValues>(
    () => ({
      nombre: "",
      departamento: 0,
      codigo: "",
      descripcion: "",
    }),
    []
  );

  // Deriva valores de edición.
  const editValues = useMemo<AreaFormValues>(
    () =>
      areaToEdit
        ? {
            nombre: areaToEdit.nombre,
            departamento: areaToEdit.departamento,
            codigo: areaToEdit.codigo ?? "",
            descripcion: areaToEdit.descripcion ?? "",
          }
        : emptyValues,
    [areaToEdit, emptyValues]
  );

  // Recibe errores de mutaciones y los asigna al estado de servidor.
  const setHookError = (field: AreaFormField, error: { message?: string }) => {
    if (!error.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createArea, isPending: isCreating } = useCreateArea(setHookError);
  const { mutateAsync: updateArea, isPending: isUpdating } = useUpdateArea(setHookError);

  // Limpia errores del campo cuando cambia su valor.
  const clearFieldErrors = (field: AreaFormField) => {
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
  const validateField = (field: AreaFormField, value: AreaFormValues[AreaFormField]) => {
    const fieldSchema = AreaFormSchema.shape[field];
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
  const validateForm = (values: AreaFormValues) => {
    const parsed = AreaFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<AreaFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as AreaFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setClientErrors(nextErrors);
    return false;
  };

  // Entrega error compatible con componentes visuales actuales.
  const getError = (field: AreaFormField) => {
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
        // Los campos opcionales viajan como null cuando quedan vacíos: el
        // backend los declara nullable y "" dispararía un valor basura.
        const codigo = value.codigo.trim().toUpperCase();
        const descripcion = value.descripcion.trim();
        const payload = {
          nombre: value.nombre.trim().toUpperCase(),
          departamento: value.departamento,
          codigo: codigo ? codigo : null,
          descripcion: descripcion ? descripcion : null,
        };

        if (isEditing && areaToEdit) {
          await updateArea({ id: areaToEdit.id, ...payload });
        } else {
          await createArea(payload);
        }

        onSuccess();
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Sincroniza valores cuando cambia la entidad en edición.
  useEffect(() => {
    const nextValues = isEditing ? editValues : emptyValues;
    form.reset(nextValues);
  }, [editValues, emptyValues, form, isEditing]);

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
  const formKey = isEditing ? `area-edit-${areaToEdit?.id ?? "ready"}` : "area-new";

  return {
    form,
    formRef,
    formKey,
    isPending,
    isEditing,
    departments,
    isLoadingDepartments,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
