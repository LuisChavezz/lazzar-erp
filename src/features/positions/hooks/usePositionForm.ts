"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { useAreas } from "@/src/features/areas/hooks/useAreas";
import { PositionFormSchema, PositionFormValues } from "../schemas/position.schema";
import { useCreatePosition } from "./useCreatePosition";
import { useUpdatePosition } from "./useUpdatePosition";
import { Position } from "../interfaces/position.interface";

interface UsePositionFormParams {
  onSuccess: () => void;
  positionToEdit?: Position | null;
}

type PositionFormField = keyof PositionFormValues;

export function usePositionForm({ onSuccess, positionToEdit }: UsePositionFormParams) {
  // Determina modo creación/edición para mantener el flujo existente.
  const isEditing = Boolean(positionToEdit?.id);

  // Empresa del workspace activo: se exige para dar de alta un puesto.
  const companyId = useWorkspaceStore((state) => state.selectedCompany.id);

  // Catálogo de áreas que alimenta el select del FK opcional.
  const { areas, isLoading: isLoadingAreas } = useAreas();

  // Conserva referencia al form para scroll superior suave al limpiar.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Mantiene estado local de envío para bloquear controles durante submit.
  const [isLoading, setIsLoading] = useState(false);

  // Separa errores de validación cliente y servidor para cada campo.
  const [clientErrors, setClientErrors] = useState<Partial<Record<PositionFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<PositionFormField, string>>>({});

  // Define valores vacíos del formulario. `area: 0` representa "Sin área".
  const emptyValues = useMemo<PositionFormValues>(
    () => ({
      nombre: "",
      area: 0,
      salario_base: "",
      descripcion: "",
    }),
    []
  );

  // Deriva valores de edición.
  const editValues = useMemo<PositionFormValues>(
    () =>
      positionToEdit
        ? {
            nombre: positionToEdit.nombre,
            area: positionToEdit.area ?? 0,
            salario_base: positionToEdit.salario_base ?? "",
            descripcion: positionToEdit.descripcion ?? "",
          }
        : emptyValues,
    [emptyValues, positionToEdit]
  );

  // Recibe errores de mutaciones y los asigna al estado de servidor.
  const setHookError = (field: PositionFormField, error: { message?: string }) => {
    if (!error.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createPosition, isPending: isCreating } = useCreatePosition(setHookError);
  const { mutateAsync: updatePosition, isPending: isUpdating } = useUpdatePosition(setHookError);

  // Limpia errores del campo cuando cambia su valor.
  const clearFieldErrors = (field: PositionFormField) => {
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
  const validateField = (field: PositionFormField, value: PositionFormValues[PositionFormField]) => {
    const fieldSchema = PositionFormSchema.shape[field];
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
  const validateForm = (values: PositionFormValues) => {
    const parsed = PositionFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<PositionFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as PositionFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setClientErrors(nextErrors);
    return false;
  };

  // Entrega error compatible con componentes visuales actuales.
  const getError = (field: PositionFormField) => {
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

      // `empresa` es obligatorio en el backend y no se captura en el form: sin
      // empresa activa el POST fallaría con un error que ningún campo muestra.
      if (!isEditing && !companyId) {
        toast.error("Selecciona una empresa antes de registrar un puesto");
        return;
      }

      setIsLoading(true);
      try {
        // Los campos opcionales viajan como null cuando quedan vacíos: el
        // backend los declara nullable y "" dispararía un valor basura.
        const salarioBase = value.salario_base.trim();
        const descripcion = value.descripcion.trim();
        const payload = {
          nombre: value.nombre.trim().toUpperCase(),
          area: value.area > 0 ? value.area : null,
          salario_base: salarioBase ? salarioBase : null,
          descripcion: descripcion ? descripcion : null,
        };

        if (isEditing && positionToEdit) {
          await updatePosition({
            id: positionToEdit.id,
            empresa: positionToEdit.empresa,
            ...payload,
          });
        } else {
          await createPosition(payload);
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
  const formKey = isEditing ? `position-edit-${positionToEdit?.id ?? "ready"}` : "position-new";

  return {
    form,
    formRef,
    formKey,
    isPending,
    isEditing,
    areas,
    isLoadingAreas,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
