"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useBanks } from "@/src/features/banks/hooks/useBanks";
import { useCurrencies } from "@/src/features/currency/hooks/useCurrencies";
import {
  BankAccountFormSchema,
  BankAccountFormValues,
} from "../schemas/bank-account.schema";
import { useCreateBankAccount } from "./useCreateBankAccount";
import { useUpdateBankAccount } from "./useUpdateBankAccount";
import { CuentaBancaria } from "../interfaces/bank-account.interface";

interface UseBankAccountFormParams {
  onSuccess: () => void;
  accountToEdit?: CuentaBancaria | null;
}

type BankAccountFormField = keyof BankAccountFormValues;

export function useBankAccountForm({
  onSuccess,
  accountToEdit,
}: UseBankAccountFormParams) {
  const isEditing = Boolean(accountToEdit?.id);

  // Catálogos que alimentan los selects de los dos FK. Se REUSAN los hooks ya
  // existentes (`banks` de EC-135 y el de monedas de `nucleo/monedas/`) en vez
  // de escribir un segundo fetcher para el mismo recurso.
  const { banks, isLoading: isLoadingBanks } = useBanks();
  const { data: currencies = [], isLoading: isLoadingCurrencies } = useCurrencies();

  // Conserva referencia al form para scroll superior suave al limpiar.
  const formRef = useRef<HTMLFormElement | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const [clientErrors, setClientErrors] = useState<
    Partial<Record<BankAccountFormField, string>>
  >({});
  const [serverErrors, setServerErrors] = useState<
    Partial<Record<BankAccountFormField, string>>
  >({});

  // `banco: 0` / `moneda: 0` son los centinelas de "Seleccionar...", que el
  // schema rechaza por no ser positivos.
  const emptyValues = useMemo<BankAccountFormValues>(
    () => ({
      banco: 0,
      moneda: 0,
      alias: "",
      titular: "",
      sucursal_bancaria: "",
      numero_cuenta: "",
      clabe: "",
      numero_cliente: "",
      convenio: "",
      fecha_apertura: "",
      observaciones: "",
    }),
    []
  );

  // Los campos nullable del backend se muestran como cadena vacía en el
  // formulario y vuelven a `null` al armar el payload.
  const editValues = useMemo<BankAccountFormValues>(
    () =>
      accountToEdit
        ? {
            banco: accountToEdit.banco,
            moneda: accountToEdit.moneda,
            alias: accountToEdit.alias ?? "",
            titular: accountToEdit.titular ?? "",
            sucursal_bancaria: accountToEdit.sucursal_bancaria ?? "",
            numero_cuenta: accountToEdit.numero_cuenta ?? "",
            clabe: accountToEdit.clabe ?? "",
            numero_cliente: accountToEdit.numero_cliente ?? "",
            convenio: accountToEdit.convenio ?? "",
            fecha_apertura: accountToEdit.fecha_apertura ?? "",
            observaciones: accountToEdit.observaciones ?? "",
          }
        : emptyValues,
    [accountToEdit, emptyValues]
  );

  const setHookError = (field: BankAccountFormField, error: { message?: string }) => {
    if (!error.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createBankAccount, isPending: isCreating } =
    useCreateBankAccount(setHookError);
  const { mutateAsync: updateBankAccount, isPending: isUpdating } =
    useUpdateBankAccount(setHookError);

  const clearFieldErrors = (field: BankAccountFormField) => {
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

  const validateField = (
    field: BankAccountFormField,
    value: BankAccountFormValues[BankAccountFormField]
  ) => {
    const fieldSchema = BankAccountFormSchema.shape[field];
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

  const validateForm = (values: BankAccountFormValues) => {
    const parsed = BankAccountFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<BankAccountFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as BankAccountFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setClientErrors(nextErrors);
    return false;
  };

  const getError = (field: BankAccountFormField) => {
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
        // luego se lee como un dato existente pero en blanco.
        const optional = (raw: string, uppercase = false) => {
          const trimmed = uppercase ? raw.trim().toUpperCase() : raw.trim();
          return trimmed ? trimmed : null;
        };

        // NO se envían `empresa` (la resuelve el backend), `saldo_actual` (lo
        // mantienen `PagoService`/`CobroService`) ni `activo` (acción de fila).
        const payload = {
          banco: value.banco,
          moneda: value.moneda,
          alias: value.alias.trim().toUpperCase(),
          titular: optional(value.titular, true),
          sucursal_bancaria: optional(value.sucursal_bancaria, true),
          // Identificadores numéricos: se recortan pero NO se pasan a mayúsculas
          // (ver `BankAccountForm`, misma razón por la que no llevan
          // `forceUppercase`). `optional()` en vez de un `.trim()` suelto para
          // que el vacío sea `null` como en el resto de los campos y no `""`:
          // el schema ya lo exige no vacío, así que esta rama es la red de
          // seguridad, no el camino normal.
          numero_cuenta: optional(value.numero_cuenta),
          clabe: optional(value.clabe),
          numero_cliente: optional(value.numero_cliente, true),
          convenio: optional(value.convenio, true),
          // `fecha_apertura` viaja explícita: vacía significa `null`. El modelo
          // tiene `default=timezone.now`, pero ese default solo aplicaría si la
          // llave se omitiera, y omitirla en el PATCH de edición significaría
          // "conservar", no "limpiar" — enviarla siempre hace que el formulario
          // signifique lo mismo al crear y al editar.
          fecha_apertura: optional(value.fecha_apertura),
          observaciones: optional(value.observaciones),
        };

        if (isEditing && accountToEdit) {
          await updateBankAccount({ id: accountToEdit.id, ...payload });
        } else {
          await createBankAccount(payload);
        }

        onSuccess();
      } finally {
        setIsLoading(false);
      }
    },
  });

  useEffect(() => {
    const nextValues = isEditing ? editValues : emptyValues;
    form.reset(nextValues);
  }, [editValues, emptyValues, form, isEditing]);

  const isPending = isCreating || isUpdating || isLoading;

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

  const formKey = isEditing
    ? `bank-account-edit-${accountToEdit?.id ?? "ready"}`
    : "bank-account-new";

  return {
    form,
    formRef,
    formKey,
    isPending,
    isEditing,
    banks,
    isLoadingBanks,
    currencies,
    isLoadingCurrencies,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
