"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { FieldError } from "react-hook-form";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useCompanyBranches } from "../../branches/hooks/useCompanyBranches";
import { useRoles } from "../../roles/hooks/useRoles";
import { User } from "../interfaces/user.interface";
import { useRegisterUser } from "./useRegisterUser";
import { useUpdateUser } from "./useUpdateUser";
import { UserFormSchema, UserFormValues } from "../schemas/user.schema";

interface UseUserFormParams {
  onSuccess: () => void;
  userToEdit?: User;
}

type UserFormField = keyof UserFormValues;

export function useUserForm({ onSuccess, userToEdit }: UseUserFormParams) {
  // Obtiene contexto de empresa/sucursal para cargar catálogos y prefijar valores.
  const companyId = useWorkspaceStore((state) => state.selectedCompany.id);
  const selectedBranchId = useWorkspaceStore((state) => state.selectedBranch?.id ?? 0);
  const { branches, isLoading: isLoadingBranches } = useCompanyBranches(companyId);
  const { data: roles = [], isLoading: isLoadingRoles } = useRoles();
  const isEditing = Boolean(userToEdit?.id);

  // Separamos errores de cliente y servidor para poder priorizarlos en pantalla.
  const [clientErrors, setClientErrors] = useState<Partial<Record<UserFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<UserFormField, string>>>({});

  // Valores base para modo creación.
  const emptyValues = useMemo<UserFormValues>(
    () => ({
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      sucursal_default: selectedBranchId,
      sucursales: [],
      roles: [],
    }),
    [selectedBranchId]
  );

  // Valores para modo edición.
  // Mapea arrays a number y mantiene password vacío para no mostrar contraseña existente.
  const editValues = useMemo<UserFormValues>(() => {
    if (!userToEdit) {
      return emptyValues;
    }

    return {
      username: userToEdit.username,
      email: userToEdit.email,
      password: "",
      first_name: userToEdit.first_name,
      last_name: userToEdit.last_name,
      sucursal_default: userToEdit.sucursal_default,
      sucursales: Array.isArray(userToEdit.sucursales)
        ? userToEdit.sucursales.map((id) => Number(id))
        : [],
      roles: Array.isArray(userToEdit.roles_ids) ? userToEdit.roles_ids.map((id) => Number(id)) : [],
    };
  }, [emptyValues, userToEdit]);

  // Filtra sólo roles activos para impedir asignación de roles inactivos.
  const activeRoles = useMemo(
    () => roles.filter((role) => (role.estatus || "").toLowerCase() === "activo"),
    [roles]
  );

  // Construye lista de prerequisitos faltantes para render alternativo.
  const missingItems = useMemo(
    () =>
      [
        branches.length === 0 && !isLoadingBranches ? "Sucursales" : null,
        activeRoles.length === 0 && !isLoadingRoles ? "Roles activos" : null,
      ].filter((item): item is string => Boolean(item)),
    [activeRoles.length, branches.length, isLoadingBranches, isLoadingRoles]
  );

  // Adaptador de errores backend emitidos por los hooks de mutación.
  const setHookError = (field: UserFormField, error: { message?: string }) => {
    if (!error?.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: registerUser, isPending: isRegisterPending } = useRegisterUser(setHookError);
  const { mutateAsync: updateUser, isPending: isUpdatePending } = useUpdateUser(setHookError);

  // Elimina errores del campo cuando el usuario vuelve a interactuar con él.
  const clearFieldErrors = (field: UserFormField) => {
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

  // Valida un campo específico (onBlur) usando el schema de Zod.
  const validateField = (field: UserFormField, value: UserFormValues[UserFormField]) => {
    const fieldSchema = UserFormSchema.shape[field];
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

  // Valida payload completo en submit y normaliza errores por campo.
  const validateForm = (values: UserFormValues) => {
    const parsed = UserFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<UserFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as UserFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });
    setClientErrors(nextErrors);
    return false;
  };

  // Prioriza mensaje de servidor sobre cliente para cada control visual.
  const getError = (field: UserFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FieldError) : undefined;
  };

  // Controla estado y submit del formulario con TanStack Form.
  // Mantiene flujo actual: edición resetea a editValues, creación a emptyValues.
  const form = useForm({
    defaultValues: isEditing ? editValues : emptyValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      if (!validateForm(value)) {
        return;
      }

      try {
        if (isEditing && userToEdit) {
          await updateUser({ id: userToEdit.id, values: value });
          form.reset(editValues);
          onSuccess();
          return;
        }

        await registerUser(value);
        form.reset(emptyValues);
        onSuccess();
      } catch {
        return;
      }
    },
  });

  // Gestiona selección/deselección para campos multiselección (roles/sucursales).
  const toggleArrayValue = (current: number[], value: number, checked: boolean) =>
    checked
      ? Array.from(new Set([...current, value]))
      : current.filter((currentValue) => currentValue !== value);

  const isArrayValueChecked = (current: number[], value: number) => current.includes(value);

  const handleDefaultBranchChange = (branchId: number) => {
    form.setFieldValue("sucursal_default", branchId);
    const currentBranches = form.getFieldValue("sucursales");
    const nextBranches = currentBranches.includes(branchId)
      ? currentBranches
      : [...currentBranches, branchId];
    form.setFieldValue("sucursales", nextBranches);
    clearFieldErrors("sucursal_default");
    clearFieldErrors("sucursales");
    validateField("sucursal_default", branchId);
    validateField("sucursales", nextBranches);
  };

  // Estado de carga agregado para deshabilitar el formulario completo.
  const isPending = isRegisterPending || isUpdatePending;
  const isLoadingData = isLoadingBranches || isLoadingRoles;

  // Restablece estado en base al modo actual del formulario.
  const handleReset = () => {
    form.reset(isEditing ? editValues : emptyValues);
    setClientErrors({});
    setServerErrors({});
  };

  // Wrapper de submit para controlar eventos DOM antes de delegar a TanStack.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  // Key estable para forzar remount limpio al cambiar entre crear/editar.
  const formKey = isEditing ? `user-edit-${userToEdit?.id ?? "ready"}` : "user-new";

  return {
    form,
    formKey,
    isEditing,
    isPending,
    isLoadingData,
    branches,
    activeRoles,
    missingItems,
    getError,
    clearFieldErrors,
    validateField,
    toggleArrayValue,
    isArrayValueChecked,
    handleDefaultBranchChange,
    handleReset,
    handleFormSubmit,
  };
}
