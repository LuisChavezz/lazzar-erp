"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { BankFormSchema, BankFormValues } from "../schemas/bank.schema";
import { useCreateBank } from "./useCreateBank";
import { useUpdateBank } from "./useUpdateBank";
import { Banco } from "../interfaces/bank.interface";

interface UseBankFormParams {
  onSuccess: () => void;
  bankToEdit?: Banco | null;
}

type BankFormField = keyof BankFormValues;

export function useBankForm({ onSuccess, bankToEdit }: UseBankFormParams) {
  // Determina modo creación/edición.
  const isEditing = Boolean(bankToEdit?.id);

  // Conserva referencia al form para scroll superior suave al limpiar.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Mantiene estado local de envío para bloquear controles durante submit.
  const [isLoading, setIsLoading] = useState(false);

  // Separa errores de validación cliente y servidor para cada campo.
  const [clientErrors, setClientErrors] = useState<Partial<Record<BankFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<BankFormField, string>>>({});

  const emptyValues = useMemo<BankFormValues>(
    () => ({
      nombre: "",
      codigo: "",
      swift: "",
      observaciones: "",
    }),
    []
  );

  // Deriva valores de edición. Los campos nullable del backend se muestran como
  // cadena vacía en el formulario y vuelven a `null` al armar el payload.
  const editValues = useMemo<BankFormValues>(
    () =>
      bankToEdit
        ? {
            nombre: bankToEdit.nombre ?? "",
            codigo: bankToEdit.codigo ?? "",
            swift: bankToEdit.swift ?? "",
            observaciones: bankToEdit.observaciones ?? "",
          }
        : emptyValues,
    [bankToEdit, emptyValues]
  );

  // Recibe errores de mutaciones y los asigna al estado de servidor.
  const setHookError = (field: BankFormField, error: { message?: string }) => {
    if (!error.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createBank, isPending: isCreating } = useCreateBank(setHookError);
  const { mutateAsync: updateBank, isPending: isUpdating } = useUpdateBank(setHookError);

  // Limpia errores del campo cuando cambia su valor.
  const clearFieldErrors = (field: BankFormField) => {
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
  const validateField = (field: BankFormField, value: BankFormValues[BankFormField]) => {
    const fieldSchema = BankFormSchema.shape[field];
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
  const validateForm = (values: BankFormValues) => {
    const parsed = BankFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<BankFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as BankFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setClientErrors(nextErrors);
    return false;
  };

  // Entrega error compatible con los componentes de formulario compartidos.
  const getError = (field: BankFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

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
        // backend los declara nullable y "" guardaría una cadena basura que
        // luego se muestra como un dato existente pero en blanco.
        const swift = value.swift.trim().toUpperCase();
        const observaciones = value.observaciones.trim();
        // `empresa` NO se envía: la resuelve el backend a partir del usuario
        // autenticado, y su serializer rechaza una empresa ajena.
        const payload = {
          nombre: value.nombre.trim().toUpperCase(),
          codigo: value.codigo.trim().toUpperCase(),
          swift: swift ? swift : null,
          observaciones: observaciones ? observaciones : null,
        };

        if (isEditing && bankToEdit) {
          await updateBank({ id: bankToEdit.id, ...payload });
        } else {
          await createBank(payload);
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

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  // Mantiene key estable para remount entre crear y editar.
  const formKey = isEditing ? `bank-edit-${bankToEdit?.id ?? "ready"}` : "bank-new";

  return {
    form,
    formRef,
    formKey,
    isPending,
    isEditing,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
