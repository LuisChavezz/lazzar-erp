"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { FormFieldError } from "../../../utils/getFieldError";
import { Branch } from "../interfaces/branch.interface";
import { BranchFormSchema, BranchFormValues } from "../schemas/branch.schema";
import { useRegisterBranch } from "./useRegisterBranch";
import { useUpdateBranch } from "./useUpdateBranch";

interface UseBranchFormParams {
  onSuccess: () => void;
  branchToEdit?: Branch;
}

type BranchField = keyof BranchFormValues;
type BranchErrorMap = Partial<Record<BranchField, string>>;

export function useBranchForm({ onSuccess, branchToEdit }: UseBranchFormParams) {
  // Determina modo edición para conservar el mismo flujo actual del formulario.
  const isEditing = Boolean(branchToEdit);

  // Referencia del formulario para scroll suave al limpiar.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Errores separados para priorizar backend sobre validación local.
  const [clientErrors, setClientErrors] = useState<BranchErrorMap>({});
  const [serverErrors, setServerErrors] = useState<BranchErrorMap>({});

  // Valores base para creación.
  const emptyValues = useMemo<BranchFormValues>(
    () => ({
      nombre: "",
      codigo: "",
      telefono: "",
      email: "",
      direccion_linea1: "",
      direccion_linea2: "",
      ciudad: "",
      estado: "",
      cp: "",
      pais: "",
      estatus: "activo",
    }),
    []
  );

  // Normaliza edición para evitar null en inputs controlados.
  const editValues = useMemo<BranchFormValues>(() => {
    if (!branchToEdit) {
      return emptyValues;
    }

    return {
      nombre: branchToEdit.nombre ?? "",
      codigo: branchToEdit.codigo ?? "",
      telefono: branchToEdit.telefono ?? "",
      email: branchToEdit.email ?? "",
      direccion_linea1: branchToEdit.direccion_linea1 ?? "",
      direccion_linea2: branchToEdit.direccion_linea2 ?? "",
      ciudad: branchToEdit.ciudad ?? "",
      estado: branchToEdit.estado ?? "",
      cp: branchToEdit.cp ?? "",
      pais: branchToEdit.pais ?? "",
      estatus: branchToEdit.estatus === "inactivo" ? "inactivo" : "activo",
    };
  }, [branchToEdit, emptyValues]);

  // Adaptador para mapear errores de mutaciones al estado local.
  const setHookError = (field: BranchField, error: { message?: string }) => {
    if (!error?.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: registerBranch, isPending: isRegisterPending } = useRegisterBranch(setHookError);
  const { mutateAsync: updateBranch, isPending: isUpdatePending } = useUpdateBranch(setHookError);

  const clearFieldErrors = (field: BranchField) => {
    setClientErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

    setServerErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Valida un campo individual al perder foco.
  const validateField = (field: BranchField, value: BranchFormValues[BranchField]) => {
    const fieldSchema = BranchFormSchema.shape[field];
    const parsed = fieldSchema.safeParse(value);

    if (parsed.success) {
      setClientErrors((prev) => {
        if (!(field in prev)) return prev;
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

  // Valida todo el payload antes de enviar.
  const validateForm = (values: BranchFormValues) => {
    const parsed = BranchFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: BranchErrorMap = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as BranchField;
      if (!field || nextErrors[field]) return;
      nextErrors[field] = issue.message;
    });

    setClientErrors(nextErrors);
    return false;
  };

  const getError = (field: BranchField): FormFieldError | undefined => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  // Núcleo del formulario con submit de crear/editar.
  const form = useForm({
    defaultValues: isEditing ? editValues : emptyValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      if (!validateForm(value)) {
        return;
      }

      try {
        if (isEditing) {
          await updateBranch(value);
        } else {
          await registerBranch(value);
        }

        form.reset(isEditing ? editValues : emptyValues);
        setClientErrors({});
        setServerErrors({});
        onSuccess();
      } catch {
        return;
      }
    },
  });

  // API similar a register para mantener el JSX del componente limpio.
  const register = (field: BranchField) => ({
    name: field,
    value: (form.getFieldValue(field) ?? "") as string,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const nextValue = event.target.value as BranchFormValues[BranchField];
      form.setFieldValue(field, nextValue);
      clearFieldErrors(field);
    },
    onBlur: () => {
      const value = form.getFieldValue(field);
      validateField(field, value);
    },
  });

  // Mapa de errores por campo para mantener contrato del formulario actual.
  const errors: Partial<Record<BranchField, FormFieldError>> = {
    nombre: getError("nombre"),
    codigo: getError("codigo"),
    telefono: getError("telefono"),
    email: getError("email"),
    direccion_linea1: getError("direccion_linea1"),
    direccion_linea2: getError("direccion_linea2"),
    ciudad: getError("ciudad"),
    estado: getError("estado"),
    cp: getError("cp"),
    pais: getError("pais"),
    estatus: getError("estatus"),
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  // Limpia y hace scroll smooth al top del formulario.
  const handleReset = () => {
    form.reset(isEditing ? editValues : emptyValues);
    setClientErrors({});
    setServerErrors({});
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const isPending = isRegisterPending || isUpdatePending;

  return {
    formRef,
    register,
    errors,
    isPending,
    isEditing,
    handleFormSubmit,
    handleReset,
  };
}