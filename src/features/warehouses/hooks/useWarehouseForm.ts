"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useCompanyBranches } from "../../branches/hooks/useCompanyBranches";
import { useCreateWarehouse } from "./useCreateWarehouse";
import { useUpdateWarehouse } from "./useUpdateWarehouse";
import { Warehouse } from "../interfaces/warehouse.interface";
import { WarehouseFormSchema, WarehouseFormValues } from "../schemas/warehouse.schema";

interface UseWarehouseFormParams {
  onSuccess: () => void;
  warehouseToEdit?: Warehouse | null;
}

type WarehouseFormField = keyof WarehouseFormValues;
const CODE_PREFIX = "ALM-";

export function useWarehouseForm({ onSuccess, warehouseToEdit }: UseWarehouseFormParams) {
  // Lee el contexto activo para obtener empresa y sucursal seleccionadas en workspace.
  const companyId = useWorkspaceStore((state) => state.selectedCompany.id);
  const selectedBranchId = useWorkspaceStore((state) => state.selectedBranch?.id ?? 0);
  const { branches, isLoading: isLoadingBranches } = useCompanyBranches(companyId);
  const isEditing = Boolean(warehouseToEdit?.id_almacen);

  // Errores locales:
  // - clientErrors: validación de Zod en cliente.
  // - serverErrors: errores de validación devueltos por backend.
  const [clientErrors, setClientErrors] = useState<Partial<Record<WarehouseFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<WarehouseFormField, string>>>({});

  // Valores iniciales en modo creación.
  // La sucursal por defecto se toma del workspace (selectedBranch).
  const defaultValues = useMemo<WarehouseFormValues>(
    () => ({
      sucursal: selectedBranchId,
      codigo: CODE_PREFIX,
      nombre: "",
    }),
    [selectedBranchId]
  );

  // Valores iniciales en modo edición.
  // Si la sucursal del almacén ya no existe en el catálogo cargado, se usa la sucursal seleccionada del workspace.
  const editValues = useMemo<WarehouseFormValues>(() => {
    if (!warehouseToEdit) {
      return defaultValues;
    }

    const hasBranch = branches.some((branch) => branch.id === warehouseToEdit.sucursal);

    return {
      sucursal: hasBranch ? warehouseToEdit.sucursal : selectedBranchId,
      codigo: warehouseToEdit.codigo,
      nombre: warehouseToEdit.nombre,
    };
  }, [branches, defaultValues, selectedBranchId, warehouseToEdit]);

  // Adaptador de errores de mutaciones hacia el estado local del formulario.
  const setHookError = (field: WarehouseFormField, error: { message?: string }) => {
    if (!error?.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createWarehouse, isPending: isCreating } = useCreateWarehouse(setHookError);
  const { mutateAsync: updateWarehouse, isPending: isUpdating } = useUpdateWarehouse(setHookError);

  // Limpia errores de un campo específico al cambiar su valor.
  const clearFieldErrors = (field: WarehouseFormField) => {
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

  // Valida un solo campo (usado en onBlur) con su regla del schema.
  const validateField = (field: WarehouseFormField, value: WarehouseFormValues[WarehouseFormField]) => {
    const fieldSchema = WarehouseFormSchema.shape[field];
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

  // Valida el formulario completo antes del submit.
  // Si falla, genera un mapa de errores por campo para pintar en UI.
  const validateForm = (values: WarehouseFormValues) => {
    const parsed = WarehouseFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<WarehouseFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as WarehouseFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });
    setClientErrors(nextErrors);
    return false;
  };

  // Prioriza errores de servidor sobre errores de cliente para cada campo.
  const getError = (field: WarehouseFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as never) : undefined;
  };

  // Orquesta estado y submit del formulario con TanStack Form.
  // Mantiene el flujo original: crear o actualizar y luego reset + onSuccess.
  const form = useForm({
    defaultValues: isEditing ? editValues : defaultValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      if (!validateForm(value)) {
        return;
      }

      try {
        if (isEditing && warehouseToEdit) {
          await updateWarehouse({ id_almacen: warehouseToEdit.id_almacen, ...value });
          form.reset(editValues);
        } else {
          await createWarehouse(value);
          form.reset(defaultValues);
        }

        setClientErrors({});
        setServerErrors({});
        onSuccess();
      } catch {
        return;
      }
    },
  });

  // Estado global de carga para bloquear interacción de UI.
  const isPending = isCreating || isUpdating;

  // Restablece el formulario al estado base según modo (edición/creación).
  const handleReset = () => {
    form.reset(isEditing ? editValues : defaultValues);
    setClientErrors({});
    setServerErrors({});
  };

  // Wrapper de submit para controlar preventDefault y delegar a TanStack Form.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  // Key estable para forzar remount entre modo creación y edición.
  const formKey = isEditing ? `warehouse-edit-${warehouseToEdit?.id_almacen ?? "ready"}` : "warehouse-new";

  return {
    form,
    formKey,
    isEditing,
    isPending,
    branches,
    isLoadingBranches,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
